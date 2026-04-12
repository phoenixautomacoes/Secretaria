const QRCode = require('qrcode');
const { getProvider } = require('../../integrations/whatsapp');
const { success } = require('../../shared/utils/response');
const asyncHandler = require('../../shared/utils/asyncHandler');

const getStatus = asyncHandler(async (req, res) => {
  const provider = getProvider();
  const status = provider.getStatus();
  const qrRaw = provider.getQR?.() || null;

  let qrDataUrl = null;
  if (qrRaw) {
    qrDataUrl = await QRCode.toDataURL(qrRaw);
  }

  success(res, { status, qr: qrDataUrl });
});

module.exports = { getStatus };
