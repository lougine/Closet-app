const { generateStyleChatReply } = require('./src/services/styleChatService');
const mongoose = require('mongoose');

async function test() {
  const garments = [
    { _id: new mongoose.Types.ObjectId(), name: 'Black T-Shirt', category: 'T-Shirts' },
    { _id: new mongoose.Types.ObjectId(), name: 'Blue Jeans', category: 'Pants' },
  ];
  
  const res = await generateStyleChatReply({
    message: 'What should I wear for a casual day?',
    garments,
    temperatureC: 22,
  });
  
  console.log('Result:', res);
}

test();
