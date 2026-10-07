const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

module.exports = async function handler(req, res) {
  // Configuración de cabeceras CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Content-Encoding');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Detectar qué almacenamiento está configurado en las variables de entorno de Vercel
  const hasBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const hasKV = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

  // Acción especial: Generar token para subida directa desde el navegador (supera el límite de 4.5MB de Vercel)
  const isUploadTokenReq = (req.query && req.query.action === 'upload-token') ||
                           (req.body && typeof req.body === 'object' && req.body.action === 'upload-token');
  if (isUploadTokenReq) {
    if (!hasBlob) {
      return res.status(400).json({ error: 'storage_missing', message: 'Vercel Blob no configurado en este proyecto' });
    }
    try {
      const { generateClientTokenFromReadWriteToken } = require('@vercel/blob/client');
      const clientToken = await generateClientTokenFromReadWriteToken({
        token: process.env.BLOB_READ_WRITE_TOKEN,
        pathname: 'config.json',
        maximumSizeInBytes: 100 * 1024 * 1024,
        validUntil: Date.now() + 15 * 60 * 1000
      });
      return res.status(200).json({ clientToken });
    } catch (err) {
      console.error('Error generando clientToken:', err);
      return res.status(500).json({ error: 'Error generando token: ' + err.message });
    }
  }

  // ─────────────────────────────────────────────
  // 1. GET: Obtener la configuración actual
  // ─────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      // Prioridad 1: Vercel Blob
      if (hasBlob) {
        try {
          const { list } = require('@vercel/blob');
          const { blobs } = await list({
            prefix: 'config.json',
            token: process.env.BLOB_READ_WRITE_TOKEN
          });
          if (blobs && blobs.length > 0) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            return res.redirect(307, blobs[0].url + '?v=' + Date.now());
          }
        } catch (blobErr) {
          console.warn('Error leyendo Vercel Blob, probando siguiente opción:', blobErr.message);
        }
      }

      // Prioridad 2: Vercel KV
      if (hasKV) {
        try {
          const { kv } = require('@vercel/kv');
          const data = await kv.get('plano_config');
          if (data) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            return res.status(200).json(data);
          }
        } catch (kvErr) {
          console.warn('Error leyendo Vercel KV, probando siguiente opción:', kvErr.message);
        }
      }

      // Prioridad 3: Archivo config.json local en el repositorio/disco
      const localFile = path.join(process.cwd(), 'config.json');
      if (fs.existsSync(localFile)) {
        const content = fs.readFileSync(localFile, 'utf8');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        return res.status(200).json(JSON.parse(content));
      }

      return res.status(404).json({ error: 'Configuración no encontrada en el servidor' });
    } catch (err) {
      console.error('Error general en GET /api/config:', err);
      return res.status(500).json({ error: 'Error al leer configuración: ' + err.message });
    }
  }

  // ─────────────────────────────────────────────
  // 2. POST: Guardar configuración
  // ─────────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      let data = null;

      // Detectar cuerpo en req.body (Buffer, string u objeto)
      let rawBuffer = null;
      if (Buffer.isBuffer(req.body)) {
        rawBuffer = req.body;
      } else if (typeof req.body === 'string') {
        rawBuffer = Buffer.from(req.body, 'utf8');
      } else if (req.body && typeof req.body === 'object') {
        data = req.body;
      } else {
        // Leer stream sin procesar
        rawBuffer = await new Promise((resolve, reject) => {
          const chunks = [];
          req.on('data', chunk => chunks.push(chunk));
          req.on('end', () => resolve(Buffer.concat(chunks)));
          req.on('error', reject);
        });
      }

      if (rawBuffer && !data) {
        // Descomprimir gzip si fue enviado comprimido (magic bytes 0x1f 0x8b)
        if (rawBuffer.length >= 2 && rawBuffer[0] === 0x1f && rawBuffer[1] === 0x8b) {
          rawBuffer = zlib.gunzipSync(rawBuffer);
        }
        data = JSON.parse(rawBuffer.toString('utf8'));
      }

      if (!data || !data.maps) {
        return res.status(400).json({ error: 'La estructura de datos enviada no contiene mapas válidos' });
      }

      // Actualizar timestamp
      data.updatedAt = Date.now();

      // Guardar en Vercel Blob si está configurado
      if (hasBlob) {
        try {
          const { put } = require('@vercel/blob');
          const blobResult = await put('config.json', JSON.stringify(data, null, 2), {
            access: 'public',
            addRandomSuffix: false,
            token: process.env.BLOB_READ_WRITE_TOKEN
          });
          return res.status(200).json({
            success: true,
            storage: 'vercel-blob',
            url: blobResult.url,
            message: 'Guardado exitosamente en Vercel Blob'
          });
        } catch (blobErr) {
          console.error('Error al guardar en Vercel Blob:', blobErr);
          return res.status(500).json({
            error: 'Error al escribir en Vercel Blob: ' + blobErr.message
          });
        }
      }

      // Guardar en Vercel KV si está configurado
      if (hasKV) {
        const { kv } = require('@vercel/kv');
        await kv.set('plano_config', data);
        return res.status(200).json({
          success: true,
          storage: 'vercel-kv',
          message: 'Guardado exitosamente en Vercel KV'
        });
      }

      // Si se está ejecutando en servidor local (Node.js tradicional)
      try {
        const localFile = path.join(process.cwd(), 'config.json');
        fs.writeFileSync(localFile, JSON.stringify(data, null, 2), 'utf8');
        return res.status(200).json({
          success: true,
          storage: 'local-disk',
          message: 'Guardado exitosamente en disco local'
        });
      } catch (fsErr) {
        // En Vercel Serverless sin Storage configurado
        return res.status(400).json({
          success: false,
          error: 'storage_missing',
          message: 'Para guardar directamente en Vercel, crea una base de datos en la pestaña "Storage" (Vercel Blob o KV) y vincúlala a este proyecto.'
        });
      }
    } catch (err) {
      console.error('Error general en POST /api/config:', err);
      return res.status(500).json({ error: 'Error al procesar guardado: ' + err.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
};


