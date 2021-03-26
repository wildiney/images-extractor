require('dotenv').config()
const puppeteer = require('puppeteer')
const fetch = require('node-fetch')
const fs = require('fs')

function saveImageToDisk(url, filename) {
  fetch(url)
    .then(res => {
      const dest = fs.createWriteStream(filename)
      res.body.pipe(dest)
    })
    .catch((err) => {
      console.log(err)
    })
}

async function extractImageLinks() {
  try {
    const browser = await puppeteer.launch({
      // headless: false,
      executablePath: "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    const page = await browser.newPage()
    await page.goto(process.env.URL, { waitUntil: 'networkidle0' })
    await page.content()

    let allImages = await page.evaluate(() => {
      let images = Array.from(document.querySelectorAll('img'))
      let imageArray = []
      images.map((image) => {
        let src = image.src

        let srcArray = src.split('/')
        let filename = srcArray[srcArray.length - 1]

        imageArray.push({ src, filename })
      })
      return imageArray
    })
    await browser.close()
    return allImages
  } catch (err) {
    console.log(err)
  }
}

(async function () {
  console.log("Downloading images...")

  let imageLinks = await extractImageLinks();

  imageLinks.map((image) => {
    let filename = `./images/${image.filename}`
    saveImageToDisk(image.src, filename)
    console.log(filename, "saved!")
  })

  console.log("Download complete!")
})()