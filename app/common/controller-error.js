function handleServiceError(ctx, controller, error) {
  controller.fail(ctx, error.message || '服务异常', error.code || 50000)
}

module.exports = { handleServiceError }
