const http = require('http');

http.get('http://localhost:3000/api/credits', (res) => {
    let data = '';
    console.log('Status Code:', res.statusCode);

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Response Body:');
        console.log(data);
    });
}).on('error', (err) => {
    console.error('Error: ', err.message);
});
