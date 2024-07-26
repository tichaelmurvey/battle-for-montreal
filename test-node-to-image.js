const nodeHtmlToImage = require('node-html-to-image');
const fs = require('fs');

//load the html file
const initial_file = fs.readFileSync('./map.html', 'utf8');
nodeHtmlToImage({
	  output: './test-image.png',
  html: initial_file
})
  .then(() => console.log('The image was created successfully'))
  .catch(console.error);