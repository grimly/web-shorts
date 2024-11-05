import process from "node:process";
import { createServer } from "http-server";
import opener from "opener";

const server = createServer({
  https: {
    cert: process.env.LOCALHOST_CERT,
    key: process.env.LOCALHOST_CERT_KEY
  },
});

server.listen(8080, "localhost.world.socgen", () => {
  console.log("Served at https://localhost.world.socgen:8080/");
  opener("https://localhost.world.socgen:8080/");
});

function stopServer() {
  console.log('Stopped');
  process.exit();
}

process.on('SIGINT', stopServer);
process.on('SIGTERM', stopServer);

if (process.platform === 'win32') {
  import('readline').then(({createInterface}) =>
    createInterface({
      input: process.stdin,
      output: process.stdout
    })
    .on('SIGINT', () => process.emit('SIGINT'))
  );
}
