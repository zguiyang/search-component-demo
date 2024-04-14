import  express from 'express';
import {  listData } from './data';
const app = express();

app.get('/query',(req, res) => {
  console.log('接收到请求', req.hostname, req.url)
  const query = req.query as { keyword?: string };
  if (!query.keyword) {
    res.send([]);
    return;
  }
  const keyword = decodeURIComponent(query.keyword  || '');
  return new Promise(resolve => {
    if (keyword.includes('lla')) {
      // 模拟超时
     setTimeout(() => {
       res.status(200).send(listData);
       resolve([]);
     }, 65000);
     return;
    }
    const result = listData.filter(item => item.name.includes(keyword));
    // setTimeout(() => {
    //   res.status(200).send(result);
    //   resolve(result);
    // }, 1000)
      setTimeout(() => {
        res.send(result);
        resolve(result);
      }, (Math.floor(Math.random() * 10) + 1 ) * 1000);
  })

})

app.listen(5174, () => {
  console.log('Server is running on port 5174');
});