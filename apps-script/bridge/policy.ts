export function allowedRequest(path: string, method: string): boolean {
  if (typeof path !== "string" || path.length > 3000 || /[\\\r\n#]/.test(path)) return false;
  const parts = path.split("?");
  if (parts.length > 2 || /%(?:2e|2f|5c)/i.test(parts[0])) return false;
  const rules: [RegExp, string[]][] = [
    [/^\/api\/dashboard$/, ["GET", "POST"]],
    [/^\/api\/settings$/, ["GET", "PUT"]],
    [/^\/api\/accounts$/, ["GET", "POST"]],
    [/^\/api\/accounts\/[a-f0-9-]{36}$/, ["PATCH", "DELETE"]],
    [/^\/api\/items\/[a-f0-9-]{36}$/, ["PATCH"]],
    [/^\/api\/jobs\/[a-f0-9-]{36}$/, ["GET"]],
    [/^\/api\/(locations|schools|status)$/, ["GET"]],
    [/^\/api\/refresh$/, ["POST"]],
  ];
  return rules.some(([pattern, methods]) => pattern.test(parts[0]) && methods.includes(method));
}
