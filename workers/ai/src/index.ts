// Bootstrap T01. Integration is not implemented or validated by this response.
export default {
  fetch(): Response {
    return new Response('Servicio en preparación', { status: 503 });
  }
};
