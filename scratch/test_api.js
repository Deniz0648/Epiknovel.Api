
import fetch from 'node-fetch';

async function test() {
    try {
        const response = await fetch('http://localhost:8080/api/books?pageSize=1');
        const json = await response.json();
        console.log(JSON.stringify(json, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

test();
