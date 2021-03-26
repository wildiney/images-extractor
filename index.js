require('dotenv').config()
const puppeteer = require('puppeteer')
const fetch = require('node-fetch')
const fs = require('fs')

function saveImageToDisk (url, filename) {
  fetch(url)
    .then(res => {
      const dest = fs.createWriteStream(filename)
      res.body.pipe(dest)
    })
    .catch((err) => {
      console.log(err)
    })
}

async function extractImageLinks () {
  try {
    const browser = await puppeteer.launch({
      // headless: false,
      executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    const page = await browser.newPage()
    await page.goto(process.env.URL, { waitUntil: 'networkidle0' })
    await page.content()

    const allImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'))
      const imageList = []
      images.map((image) => {
        const src = image.src
        const srcPaths = src.split('/')
        const filename = srcPaths[srcPaths.length - 1]

        return imageList.push({ src, filename })
      })
      return imageList
    })
    await browser.close()
    return allImages
  } catch (err) {
    console.log(err)
  }
}

(async function () {
  console.log('Downloading images...')

  try {
    const imageLinks = await extractImageLinks()
    imageLinks.forEach((image) => {
      const filename = `./images/${image.filename}`
      saveImageToDisk(image.src, filename)
      console.log(filename, 'saved!')
    })

    console.log('Download complete!')
  } catch (err) {
    console.log(err)
  }
})()
