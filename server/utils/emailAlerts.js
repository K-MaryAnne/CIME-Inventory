// In your itemController.js, update the code that generates barcodes:

// For generated barcodes, only generate a new one if explicitly requested
// or if the item doesn't have a barcode yet
let finalBarcode = item.barcode;
let finalBarcodeType = item.barcodeType;

if (newBarcodeType === 'existing') {
  // Use the provided barcode
  finalBarcode = newBarcode;
  finalBarcodeType = 'existing';
} else if (newBarcodeType === 'generate' && (!item.barcode || item.barcodeType === 'existing' || newBarcode === '')) {
  // Generate a scanner-friendly numeric barcode
  const prefix = '1000';  // Numeric prefix 
  const timestamp = Date.now().toString().substring(7, 13);  // 6 digits from timestamp
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  finalBarcode = `${prefix}${timestamp}${random}`;
  finalBarcodeType = 'generate';
}