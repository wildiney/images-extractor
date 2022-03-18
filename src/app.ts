/* eslint-disable no-undef */
import dotenv from 'dotenv'
import * as fs from 'fs'
import inquirer from 'inquirer'
import fetch from 'node-fetch'
import path from 'path'
import puppeteer from 'puppeteer'
dotenv.config()

interface IImages {
  source: string;
  filename: string;
}

class ExtractImages {
  protected wsChromeEndpointURL: string | undefined
  protected destinationFolder: string
  protected newbrowser: puppeteer.Browser | undefined
  protected page: puppeteer.Page | undefined

  constructor () {
    this.wsChromeEndpointURL = process.env.WSCHROME_ENDPOINT_URL
    this.destinationFolder = process.env.DESTINATION_FOLDER || 'images'
  }

  async init () {
    if (this.wsChromeEndpointURL !== undefined) {
      try {
        this.newbrowser = await puppeteer.connect({ browserWSEndpoint: this.wsChromeEndpointURL })
      } catch (err) {
        throw Error('Erro at WS in Chrome')
      }
    } else {
      this.newbrowser = await puppeteer.launch({ headless: false })
    }
    this.page = await this.newbrowser.newPage()

    this.checkAndCreateFolder()
  }

  checkAndCreateFolder () {
    if (!fs.existsSync(this.destinationFolder)) {
      fs.mkdir(this.destinationFolder, (err) => {
        if (err !== null) {
          console.log(err)
        }
      })
    }
  }

  saveImageToDisk (url: string, filename: string) {
    fetch(url)
      .then(res => {
        let cleanedFilename = filename.split('?')[0]
        if (!(
          cleanedFilename.endsWith('.png') ||
          cleanedFilename.endsWith('.gif') ||
          cleanedFilename.endsWith('.jpg'))) {
          cleanedFilename += '.jpg'
        }
        const dest = fs.createWriteStream(path.normalize(cleanedFilename))
        res.body.pipe(dest)
      })
      .catch((err) => {
        console.log('Erro', err)
      })
  }

  async extractImageLinks (selector: string) {
    if (this.page !== undefined) {
      try {
        await this.page.goto(process.env.URL!, { waitUntil: 'networkidle2' })
        await this.page.content()
        this.page.on('console', (msg) => console.log('Campanhas:', msg.text()))

        const allImages = await this.page!.evaluate((selector) => {
          const querySelector = document.querySelectorAll(selector)
          const images = Array.from(querySelector)
          const imageList: IImages[] = []
          images.map((image) => {
            let source: string
            if (selector === 'img') {
              source = (image as HTMLImageElement).src
            } else {
              source = (image as HTMLAnchorElement).href
            }
            const srcPaths = source.split('/')
            const filename = srcPaths[srcPaths.length - 1]

            return imageList.push({ source, filename })
          })
          return imageList
        }, selector)
        await this.page.close()
        return allImages
      } catch (err) {
        console.log(err)
      }
    }
  }

  async run (selector: string) {
    console.log('Downloading images...')

    try {
      const imageLinks: IImages[] | undefined = await this.extractImageLinks(selector)
      if (!imageLinks) return
      for (const image of imageLinks) {
        const filename = `${process.env.DESTINATION_FOLDER}/${image.filename}`
        if (fs.existsSync(filename)) {
          return
        }
        await this.saveImageToDisk(image.source, filename)
        console.log(filename, 'saved!')
      }

      console.log('Download complete!')
    } catch (err) {
      console.log(err)
    }
  }
}

inquirer
  .prompt([
    {
      type: 'list',
      name: 'selector',
      message: "What's the CSS Selector?",
      choices: [
        'img',
        'a[data-fancybox="images"]',
        'other'
      ]
    }
  ])
  .then(async (selector) => {
    const imagesFrom = new ExtractImages()
    await imagesFrom.init()

    if (selector.selector === 'other') {
      inquirer
        .prompt([{
          name: 'selector',
          message: "What's the CSS Selector?",
          default: 'img'
        }])
        .then(async (selector) => {
          await imagesFrom.run(selector.selector)
        })
        .catch((error) => {
          if (error.isTtyError) {
            console.log("Prompt couldn't be rendered")
          } else {
            console.log('Something went very wrong...')
          }
        })
    } else {
      await imagesFrom.run(selector.selector)
    }
  })
