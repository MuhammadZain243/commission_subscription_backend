const { StatusCodes } = require('http-status-codes');

const responseFormatter = (req, res, next) => {
  // Success response helper
  res.success = (data, message = 'Success', statusCode = StatusCodes.OK) => {
    return res.status(statusCode).json({
      status: statusCode,
      message,
      data,
    });
  };

  // Error response helper
  res.error = (
    message = 'Error occurred',
    statusCode = StatusCodes.INTERNAL_SERVER_ERROR,
    details = null
  ) => {
    return res.status(statusCode).json({
      status: 'error',
      message,
      ...(details && { details }),
    });
  };

  // Paginated response helper
  res.paginated = (data, pagination, message = 'Success') => {
    return res.status(StatusCodes.OK).json({
      status: 'success',
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        totalPages: pagination.totalPages,
        totalItems: pagination.totalItems,
        hasNext: pagination.hasNext,
        hasPrev: pagination.hasPrev,
      },
    });
  };

  next();
};

module.exports = { responseFormatter };
