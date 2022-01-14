require('dotenv').config()
const puppeteer = require('puppeteer')
const fetch = require('node-fetch')
const fs = require('fs')
const inquirer = require('inquirer')

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
      const querySelector = document.querySelectorAll(selector)
      const images = Array.from(querySelector)
      const imageList = []
      images.map((image) => {
        let src
        if (querySelector === 'img') {
          src = image.src
        } else {
          src = image.href
        }
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

async function run (selector) {
  console.log('Downloading images...')

  try {
    const imageLinks = await extractImageLinks(selector)
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
}

inquirer
  .prompt([{
    name: 'selector',
    message: "What's the CSS Selector?",
    default: 'img'
  }])
  .then((selector) => {
    run(selector.selector)
  })
