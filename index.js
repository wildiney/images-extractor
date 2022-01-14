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

async function extractImageLinks (selector) {
  try {
    const browser = await puppeteer.launch({
      // headless: false,
      executablePath: process.env.CHROME_EXECUTABLE_PATH,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    const page = await browser.newPage()
    await page.goto(process.env.URL, { waitUntil: 'networkidle0' })
    await page.content()

    const allImages = await page.evaluate(({ selector }) => {
      // const images = Array.from(document.querySelectorAll('img'))
      const images = Array.from(document.querySelectorAll(selector))
      const imageList = []
      images.map((image) => {
        // const src = image.src
        const src = image.href
        const srcPaths = src.split('/')
        const filename = srcPaths[srcPaths.length - 1]

        return imageList.push({ src, filename })
      })
      return imageList
    }, { selector })
    await browser.close()
    return allImages
  } catch (err) {
    console.log(err)
  }
}

(async function () {
  console.log('Downloading images...')

  try {
    const imageLinks = await extractImageLinks('a[data-fancybox="images"]')
    for (const image of imageLinks) {
      const filename = `./images/${image.filename}`
      if (fs.existsSync(filename)) {
        return
      }
      saveImageToDisk(image.src, filename)
      console.log(filename, 'saved!')
    }

    console.log('Download complete!')
  } catch (err) {
    console.log(err)
  }
})()
