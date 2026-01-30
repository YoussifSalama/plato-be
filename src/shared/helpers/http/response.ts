export default function responseFormatter<T, U>(
  data?: T,
  meta?: U,
  message: string = "Success",
  statusCode: number = 200,
) {
  return {
    message,
    statusCode,
    data,
    meta,
  };
}
