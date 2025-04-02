// const { default: SAXParser } = require("./SAXParser/sax-parser");
// import * as SAXParser from './SAXParser/sax-parser';

import { SAXParser } from "./SAXParser/sax-parser.ts";

console.log('hello world');
// console.log(new SAXParser('document.html'))
new SAXParser('document.html').getElementById('tag')

// new SAXParser('document.html')