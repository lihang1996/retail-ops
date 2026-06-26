function handleServiceError(ctx, controller, error) {
  if (!error?.code || error.code >= 50000) {
    console.error('[service-error]', error?.message || error)
  }
  controller.fail(ctx, error.message || '服务异常', error.code || 50000)
}

module.exports = { handleServiceError }
