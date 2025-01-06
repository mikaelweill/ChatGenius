export async function POST() {
  return new Response(null, {
    status: 200,
    headers: {
      'Set-Cookie': 'session-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    }
  })
} 