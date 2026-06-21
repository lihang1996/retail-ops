const ALLOWED_EXT = /\.(xlsx|xls|csv)$/i
const MAX_SIZE = 5 * 1024 * 1024

module.exports = (app) => {
  const multer = require('@koa/multer')
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_SIZE },
    fileFilter: (_req, file, cb) => {
      cb(null, ALLOWED_EXT.test(file.originalname || ''))
    },
  })

  return {
    single(field) {
      const mw = upload.single(field)
      return async (ctx, next) => {
        try {
          await mw(ctx, next)
        } catch (err) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            ctx.status = 200
            ctx.body = { success: false, code: 42200, message: '文件超过 5MB 限制' }
            return
          }
          throw err
        }
      }
    },
  }
}
