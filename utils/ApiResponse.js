class ApiResponse {
  constructor(
    statusCode,
    message = "Welcome",
    propertyName = "user",
    propertyValue = null
  ) {
    this.statusCode = statusCode;
    this.message = message;
    this[propertyName] = propertyValue;
    this.success = statusCode >= 200 && statusCode < 400;
  }
}

export { ApiResponse };
