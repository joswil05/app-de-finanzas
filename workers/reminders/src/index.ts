// Bootstrap T01. No push, cron, OAuth or delivery guarantees are implemented here.
export default {
  fetch(): Response {
    return new Response('Servicio en preparación', { status: 503 });
  }
};
