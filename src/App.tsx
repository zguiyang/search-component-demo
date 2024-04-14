import {useState} from "react";
import  axios from 'axios';

// 函数节流
function throttle(func:any, delay: number) {
    let lastExecTime = 0;
    let timeoutId: any;

    return function (...args:any) {
        const currentTime = Date.now();
        const elapsedTime = currentTime - lastExecTime;
        if (elapsedTime >= delay) {
            // @ts-ignore
            func.apply(this, args);
            lastExecTime = currentTime;
        } else {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                // @ts-ignore
                func.apply(this, args);
                lastExecTime = Date.now();
            }, delay - elapsedTime);
        }
    };
}

// 存储当前正在执行的查询任务
const pendingQueryTasks: Array<{
  cancel: () => void,
  keyword: string,
  taskIndex: number,
}> = [];
// 输入框中输入的最新的关键字
let latestKeyword = '';
let latestQueryIndex = 0;

function App() {
    const [loading, setLoading] = useState(false);
    const [queryError, setQueryError] = useState(false);
    const [searchResult, setSearchResult] = useState<Array<{name: string, address: string}>>([]);

   function creatQueryTask(keyword: string) {
    const controller = new AbortController();
    const signal = controller.signal;
    async function run() {
      try {
        // setLoading(true);
        // mock 数据 /mock/data.ts
        const response = await axios.get(`/api/query`, {
          timeout: 60000,
          params: {
            keyword,
          },
          signal,
        });

        setQueryError(false);
        if (response.status === 200) {
          const data = response.data;
          return Promise.resolve({
            success: true,
            data
          });
        } else {
          return Promise.resolve({
            success: false,
            data: []
          });
        }
      } catch (err:any) {
        console.error( err);
        if (!(err instanceof axios.Cancel)) {
          setQueryError(true);
        }
        return Promise.resolve({
          success: false,
          isCancel: true,
          data: []
        });
      }
    }

    function  cancel () {
      controller.abort();
    }
    return { run, cancel };
  }

  // 处理查询任务
  async function handleRunQueryTask (taskObj:{
    run: () => Promise<{
      data: Array<{name: string, address: string}>,
      success: boolean,
      isCancel?: boolean
    }>,
    taskIndex: number,
    cancel: () => void,
    keyword: string
    }) {
      const { run, cancel, keyword, taskIndex} = taskObj;
      pendingQueryTasks.push({ cancel, keyword, taskIndex });
      setLoading(true);
      const result = await run();
      setLoading(false);
      if (result.success) {
        setSearchResult(result.data);
      }
      if (latestKeyword === keyword && taskIndex === latestQueryIndex) {
        // setLoading(false);
        if (pendingQueryTasks.length === 0) {
          return;
        }
        console.warn('最新请求已响应,执行清除任务...', pendingQueryTasks);
        // 最新任务执行完毕，清除队列中剩余任务
        pendingQueryTasks.forEach(item => {
          if (item.keyword !== keyword) {
            item.cancel();
          }
        });
        pendingQueryTasks.length = 0;
        latestQueryIndex = 0;
      } else {
        const completedTaskIndex = pendingQueryTasks.findIndex(item => item.keyword === keyword && item.taskIndex === taskIndex);
        if (completedTaskIndex >= 0) {
          pendingQueryTasks.splice(completedTaskIndex, 1);
        }
      }
  }

  // 添加查询任务
 async function  addQueryTask(keyword: string, index: number = 0) {
   const { run, cancel } = creatQueryTask(keyword);
   await handleRunQueryTask({
     run,
     taskIndex: index,
     cancel,
     keyword
   });
  }

  // 订阅节流函数
     const handleSearch =  throttle(async (keyword: string) => {
      if (keyword.trim() !== '') {
        latestKeyword = keyword;
        ++latestQueryIndex;
        await addQueryTask(keyword, latestQueryIndex);
      }
     }, 60)

  // 渲染高亮关键字
  function renderHighlightWord(keyword: string, text: string) {
     if (!keyword) {
       return text;
     }
      const reg = new RegExp(keyword, 'g');
    return text.replace(reg, match => `<span class="text-amber-600 font-bold highlight-word">${match}</span>`);
  }

  return (
    <div id={'search-demo'} className={'relative  w-2/3 min-h-96 ml-auto mr-auto  mt-24'}>
        <input id={'search-input'} className={'border-2 border-gray-300 rounded-lg  h-10 px-4 w-full'} type={'text'}
               onChange={(e) => handleSearch(e.target.value)} placeholder={'请输入关键字, a, b, c...'} />
       <div className={'mt-10'} id={'search-result'}>
         {
           loading ? (
             <div className={'text-center text-blue-500  font-bold loading-hint'}>
               查询中...
             </div>
           ) : (
             <>
               {
                 queryError ? (
                   <div className={'text-center text-red-500 font-bold error-hint'}>
                     查询失败，请稍后重试
                   </div>
                 ) : (
                   <>
                     {
                       searchResult.length> 0 ? (
                         <ul className={'m-0 p-0 text-xl'}>
                           {
                             searchResult.map((item, index) => {
                               return (
                                 <li className={'mb-2'} key={item.address}>
                                   <p className={'p-0 text-gray-400'}>序号：{index + 1}</p>
                                   <p className={'p-0'}>名称：
                                     <span dangerouslySetInnerHTML={{
                                       __html: renderHighlightWord(latestKeyword, item.name)
                                     }}></span>
                                   </p>
                                   <p className={'p-0 text-gray-500'}>地址：{item.address}</p>
                                 </li>
                               )
                             })
                           }
                         </ul>
                       ) : (

                         <div className={'text-center text-gray-500 empty-hint'}>
                           { latestKeyword === '' ? '无数据进行展示, 可输入关键字进行搜索' : `未查询到关键字"${latestKeyword}"相关数据` }
                         </div>
                       )
                     }
                   </>
                 )
               }
             </>
           )
         }
       </div>
    </div>
  )
}

export default App;
