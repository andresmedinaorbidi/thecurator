export async function resizeImageFile(
  file: File,
  maxDim = 3200,
  maxSizeKB = 1200,
) {
  const dataUrl = await readFile(file)
  const output = await resizeDataUrl(dataUrl, maxDim, maxSizeKB)

  return {
    name: file.name,
    base64: output.split(',')[1],
    preview: output,
    mediaType: 'image/jpeg',
    sizeKB: Math.round((output.length * 0.75) / 1024),
  }
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error(`Unable to read "${file.name}".`))
    reader.readAsDataURL(file)
  })
}

function resizeDataUrl(dataUrl: string, maxDim: number, maxSizeKB: number) {
  return new Promise<string>((resolve) => {
    const image = new Image()
    image.onload = () => {
      let width = image.width
      let height = image.height

      if (width > maxDim || height > maxDim) {
        const scale = Math.min(maxDim / width, maxDim / height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }

      if (height > width * 3) {
        const tallScale = (width * 3) / height
        width = Math.round(width * tallScale)
        height = Math.round(height * tallScale)
      }

      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      canvas.width = width
      canvas.height = height
      context?.drawImage(image, 0, 0, width, height)

      let quality = 0.82
      let output = canvas.toDataURL('image/jpeg', quality)

      while ((output.length * 0.75) / 1024 > maxSizeKB && quality > 0.25) {
        quality -= 0.1
        output = canvas.toDataURL('image/jpeg', quality)
      }

      resolve(output)
    }

    image.src = dataUrl
  })
}
