/** DailyBrief Apps Script frontend. Secrets never enter HtmlService output. */
function include_(name) {
  if (['Styles', 'Bundle'].indexOf(name) < 0) throw new Error('Invalid include');
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}
function doGet(e) {
  var p = (e && e.parameter) || {};
  var route = p.page === 'settings' ? '/settings' : p.page === 'demo' ? '/demo' : '/';
  var params = [];
  ['tab', 'view', 'connected', 'error'].forEach(function(key) {
    if (typeof p[key] === 'string') params.push(encodeURIComponent(key) + '=' + encodeURIComponent(p[key].slice(0, 100)));
  });
  var template = HtmlService.createTemplateFromFile('Index');
  template.bootJson = JSON.stringify({route: route + (params.length ? '?' + params.join('&') : '')})
    .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  return template.evaluate().setTitle('DailyBrief — 나의 하루, 한눈에')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
function allowedRequest_(path, method) {
  if (typeof path !== 'string' || path.length > 3000 || /[\\\r\n#]/.test(path)) return false;
  var parts = path.split('?');
  if (parts.length > 2 || /%(?:2e|2f|5c)/i.test(parts[0])) return false;
  var rules = [
    ['^/api/dashboard$', ['GET', 'POST']],
    ['^/api/settings$', ['GET', 'PUT']],
    ['^/api/accounts$', ['GET', 'POST']],
    ['^/api/accounts/[a-f0-9-]{36}$', ['PATCH', 'DELETE']],
    ['^/api/items/[a-f0-9-]{36}$', ['PATCH']],
    ['^/api/jobs/[a-f0-9-]{36}$', ['GET']],
    ['^/api/(locations|schools|status)$', ['GET']],
    ['^/api/refresh$', ['POST']]
  ];
  return rules.some(function(rule) { return new RegExp(rule[0]).test(parts[0]) && rule[1].indexOf(method) >= 0; });
}
function backend_(path, method, body) {
  var properties = PropertiesService.getScriptProperties();
  var base = (properties.getProperty('BRIDGE_URL') || '').replace(/\/$/, '');
  var token = properties.getProperty('BRIDGE_TOKEN') || '';
  if (!/^https:\/\/[^/?#]+$/.test(base) || token.length < 32) throw new Error('BRIDGE_URL(HTTPS 주소)와 BRIDGE_TOKEN 설정이 필요합니다.');
  var options = {method: method.toLowerCase(), headers: {Authorization: 'Bearer ' + token},
    muteHttpExceptions: true, followRedirects: false, validateHttpsCertificates: true};
  if (body !== null && body !== undefined) {
    options.contentType = 'application/json';
    options.payload = JSON.stringify(body);
    if (options.payload.length > 500000) throw new Error('요청 데이터가 너무 큽니다.');
  }
  var response = UrlFetchApp.fetch(base + path, options);
  var status = response.getResponseCode();
  if (status >= 300 && status < 400) throw new Error('브리지 주소가 리디렉션됩니다. 최종 HTTPS 주소를 설정하세요.');
  var data;
  try { data = JSON.parse(response.getContentText()); }
  catch (_) { throw new Error('서버 응답을 읽지 못했습니다. 브리지 연결을 확인해 주세요.'); }
  return {status: status, data: data};
}
function proxyRequest(input) {
  if (!input || !allowedRequest_(input.path, input.method)) throw new Error('허용되지 않은 요청입니다.');
  return backend_(input.path, input.method, input.body);
}
function startGmailConnection() {
  var result = backend_('/bridge/oauth-ticket', 'POST', {});
  if (result.status !== 200) throw new Error(result.data.error || 'Gmail 연결을 시작하지 못했습니다.');
  return result.data;
}
function checkConnection() {
  var result = backend_('/api/status', 'GET', null);
  return {status: result.status, connected: result.status === 200};
}
