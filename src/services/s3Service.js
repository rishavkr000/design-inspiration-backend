const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const logger = require('../config/logger');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const uploadToS3 = async (fileBuffer, fileName) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: fileName,
    Body: fileBuffer,
    ContentType: 'image/png',
  };

  try {
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    logger.info(`Uploaded file to S3: ${fileName}`);
    return url;
  } catch (error) {
    logger.error(`S3 upload error: ${error.message}`);
    throw error;
  }
};

module.exports = { uploadToS3 };