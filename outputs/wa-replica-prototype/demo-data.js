window.WA_DEMO = (() => {
  const day = new Date(); day.setHours(10,0,0,0);
  const at = (days,hour=10) => { const d=new Date(day);d.setDate(d.getDate()+days);d.setHours(hour,0,0,0);return d.toISOString(); };
  return {
    version: 1,
    members: [
      {id:'lin',name:'林予',initial:'予',role:'agent',team:'北美一组',color:'jade'},
      {id:'chen',name:'陈珂',initial:'珂',role:'agent',team:'北美一组',color:'blue'},
      {id:'su',name:'苏晓',initial:'晓',role:'agent',team:'西语组',color:'peach'},
      {id:'admin',name:'周宁',initial:'宁',role:'manager',team:'运营管理',color:'purple'}
    ],
    accounts: [
      {id:'a1',name:'美国 · 咨询 01',number:'+1 (202) 555-0141',owner:'lin',country:'US',state:'online',color:'jade',note:'Facebook 美国广告咨询',lastSync:'刚刚'},
      {id:'a2',name:'美国 · 老客 02',number:'+1 (202) 555-0142',owner:'lin',country:'US',state:'online',color:'blue',note:'老客户维护与复购',lastSync:'1 分钟前'},
      {id:'a3',name:'波多黎各 · 西语',number:'+1 (787) 555-0143',owner:'lin',country:'PR',state:'reconnect',color:'peach',note:'西语咨询 · 需要重新连接',lastSync:'24 分钟前'},
      {id:'a4',name:'美国 · 咨询 03',number:'+1 (202) 555-0144',owner:'chen',country:'US',state:'online',color:'purple',note:'北美一组',lastSync:'刚刚'},
      {id:'a5',name:'波多黎各 · 咨询 02',number:'+1 (787) 555-0145',owner:'su',country:'PR',state:'online',color:'gold',note:'西语组',lastSync:'2 分钟前'}
    ],
    tagGroups: [
      {id:'interest',name:'客户意向',scope:'team',owner:null},
      {id:'source',name:'来源渠道',scope:'team',owner:null},
      {id:'preference',name:'服务偏好',scope:'team',owner:null},
      {id:'personal',name:'我的工作标记',scope:'private',owner:'lin'}
    ],
    tags: [
      {id:'high',name:'高意向',group:'interest',color:'jade'},
      {id:'quote',name:'待报价',group:'interest',color:'gold'},
      {id:'return',name:'复购客户',group:'interest',color:'purple'},
      {id:'facebook',name:'Facebook 广告',group:'source',color:'blue'},
      {id:'referral',name:'客户转介绍',group:'source',color:'peach'},
      {id:'es',name:'西语沟通',group:'preference',color:'peach'},
      {id:'en',name:'英语沟通',group:'preference',color:'blue'},
      {id:'important',name:'重点跟进',group:'personal',color:'purple'},
      {id:'catalog',name:'已发目录',group:'personal',color:'slate'}
    ],
    customers: [
      {id:'c1',name:'Ava Thompson',initials:'AT',color:'peach',phone:'+1 (512) 555-0140',country:'US',city:'Austin',timezone:'America/Chicago',language:'英语',owner:'lin',account:'a1',tags:['high','quote','facebook'],stage:'跟进中',source:'Facebook 广告',campaign:'US · 咨询广告 A',ad:'目录介绍 · 素材 02',unread:2,star:true,last:'09:42',preview:'Hi! Could you send me the latest catalog?',translation:'你好！可以发我最新的产品目录吗？',followup:at(0,15),notes:'偏好通过文字沟通，询问目录后希望了解交付安排。',contactRefs:[{account:'a1',owner:'lin'},{account:'a4',owner:'chen'}]},
      {id:'c2',name:'Mateo Rivera',initials:'MR',color:'blue',phone:'+1 (787) 555-0151',country:'PR',city:'San Juan',timezone:'America/Puerto_Rico',language:'西班牙语',owner:'lin',account:'a3',tags:['es','facebook','important'],stage:'新客户',source:'Facebook 广告',campaign:'PR · 西语广告 B',ad:'品牌介绍 · 素材 01',unread:1,star:false,last:'09:28',preview:'¿Hacen envíos a Puerto Rico?',translation:'你们可以发货到波多黎各吗？',followup:at(-1,16),notes:'优先用西语回复，确认收件地区。',contactRefs:[{account:'a3',owner:'lin'}]},
      {id:'c3',name:'Olivia Bennett',initials:'OB',color:'purple',phone:'+1 (305) 555-0152',country:'US',city:'Miami',timezone:'America/New_York',language:'英语',owner:'lin',account:'a2',tags:['return','en'],stage:'已成交',source:'老客户复购',campaign:'',ad:'',unread:0,star:true,last:'08:56',preview:'Thanks, I received the details. I’ll check them today.',translation:'谢谢，我收到资料了，今天会查看。',followup:at(1,11),notes:'老客户，倾向于邮件同步资料。',contactRefs:[{account:'a2',owner:'lin'}]},
      {id:'c4',name:'Ethan Brooks',initials:'EB',color:'jade',phone:'+1 (415) 555-0153',country:'US',city:'San Francisco',timezone:'America/Los_Angeles',language:'英语',owner:'lin',account:'a1',tags:['quote','facebook'],stage:'已报价',source:'Facebook 广告',campaign:'US · 咨询广告 A',ad:'目录介绍 · 素材 01',unread:0,star:false,last:'08:35',preview:'Could you confirm the delivery timeframe?',translation:'可以确认一下交付时效吗？',followup:at(0,17),notes:'已发送初步报价，下一次沟通确认交付需求。',contactRefs:[{account:'a1',owner:'lin'}]},
      {id:'c5',name:'Sofia Morales',initials:'SM',color:'gold',phone:'+1 (787) 555-0154',country:'PR',city:'Ponce',timezone:'America/Puerto_Rico',language:'西班牙语',owner:'lin',account:'a3',tags:['es','high'],stage:'跟进中',source:'网站咨询',campaign:'',ad:'',unread:0,star:false,last:'昨天',preview:'Perfecto, gracias por la información.',translation:'好的，谢谢你的信息。',followup:at(2,14),notes:'需要一份西语版本的说明。',contactRefs:[{account:'a3',owner:'lin'}]},
      {id:'c6',name:'Noah Wilson',initials:'NW',color:'slate',phone:'+1 (212) 555-0155',country:'US',city:'New York',timezone:'America/New_York',language:'英语',owner:'lin',account:'a2',tags:['referral','catalog'],stage:'培育中',source:'客户转介绍',campaign:'',ad:'',unread:0,star:false,last:'昨天',preview:'I’ll get back to you once I review the catalog.',translation:'我看完目录后会再联系你。',followup:at(3,10),notes:'来自现有客户转介绍，暂时了解为主。',contactRefs:[{account:'a2',owner:'lin'}]},
      {id:'c7',name:'Mia Carter',initials:'MC',color:'blue',phone:'+1 (713) 555-0156',country:'US',city:'Houston',timezone:'America/Chicago',language:'英语',owner:'chen',account:'a4',tags:['facebook','high'],stage:'跟进中',source:'Facebook 广告',campaign:'US · 咨询广告 C',ad:'品牌介绍 · 素材 03',unread:3,star:false,last:'09:39',preview:'Hello, I’d like to learn more.',translation:'你好，我想了解更多。',followup:at(0,14),notes:'等待补充具体需求。',contactRefs:[{account:'a4',owner:'chen'}]},
      {id:'c8',name:'Lucas Torres',initials:'LT',color:'peach',phone:'+1 (787) 555-0157',country:'PR',city:'Carolina',timezone:'America/Puerto_Rico',language:'西班牙语',owner:'su',account:'a5',tags:['es','quote'],stage:'已报价',source:'Facebook 广告',campaign:'PR · 西语广告 B',ad:'服务介绍 · 素材 02',unread:1,star:false,last:'09:10',preview:'¿Me puede enviar una cotización?',translation:'能发一份报价给我吗？',followup:at(-1,10),notes:'已收到报价请求。',contactRefs:[{account:'a5',owner:'su'}]}
    ],
    messages: {
      c1:[
        {id:'m1',side:'in',text:'Hi, I saw your ad on Facebook and would like to know more.',translated:'你好，我在 Facebook 看到了你们的广告，想进一步了解。',time:'昨天 16:32'},
        {id:'m2',side:'out',text:'Hi Ava, happy to help! What information would be most useful for you?',time:'昨天 16:34',read:true},
        {id:'m3',side:'in',text:'I’m comparing a few options. The product details and delivery arrangements would help.',translated:'我正在比较几个选择，想了解产品详情和交付安排。',time:'昨天 16:38'},
        {id:'m4',side:'in',text:'Hi! Could you send me the latest catalog?',translated:'你好！可以发我最新的产品目录吗？',time:'09:42'}
      ],
      c2:[{id:'m5',side:'in',text:'Hola, vi su anuncio y quisiera más información.',translated:'你好，我看到了广告，希望了解更多信息。',time:'09:25'},{id:'m6',side:'in',text:'¿Hacen envíos a Puerto Rico?',translated:'你们可以发货到波多黎各吗？',time:'09:28'}],
      c3:[{id:'m7',side:'out',text:'I’ve put the information together for you. Let me know if you have any questions.',time:'08:50',read:true},{id:'m8',side:'in',text:'Thanks, I received the details. I’ll check them today.',translated:'谢谢，我收到资料了，今天会查看。',time:'08:56'}],
      c4:[{id:'m9',side:'out',text:'Here is the initial quote. We can adjust it once you confirm your requirements.',time:'昨天 14:05',read:true},{id:'m10',side:'in',text:'Could you confirm the delivery timeframe?',translated:'可以确认一下交付时效吗？',time:'08:35'}]
    },
    activities: {
      c1:[{text:'加入标签「高意向」「待报价」',by:'林予',time:'今天 09:45'},{text:'通过 Facebook 广告首次咨询',by:'系统',time:'昨天 16:32'}],
      c2:[{text:'创建西语咨询跟进提醒',by:'林予',time:'昨天 15:20'}]
    },
    tasks:[
      {id:'t1',customer:'c2',owner:'lin',title:'确认波多黎各交付需求',due:at(-1,16),priority:'high',done:false},
      {id:'t2',customer:'c1',owner:'lin',title:'发送目录，了解具体需求',due:at(0,15),priority:'high',done:false},
      {id:'t3',customer:'c4',owner:'lin',title:'补充报价与交付说明',due:at(0,17),priority:'normal',done:false},
      {id:'t4',customer:'c3',owner:'lin',title:'老客户资料回访',due:at(1,11),priority:'normal',done:false},
      {id:'t5',customer:'c5',owner:'lin',title:'确认客户是否需要西语资料',due:at(2,14),priority:'normal',done:false},
      {id:'t6',customer:'c6',owner:'lin',title:'目录发送后回访',due:at(3,10),priority:'normal',done:false},
      {id:'t7',customer:'c7',owner:'chen',title:'梳理客户需求',due:at(0,14),priority:'normal',done:false},
      {id:'t8',customer:'c8',owner:'su',title:'发送报价资料',due:at(-1,10),priority:'high',done:false}
    ],
    quickReplies:[
      {id:'q1',title:'目录介绍',scope:'公共话术',zh:'你好，很高兴为你介绍。我会整理最新的目录，请问你想先了解哪一部分？',en:'Hi, happy to help. I can put together the latest catalog for you. Which details would you like to start with?',es:'Hola, con gusto. Puedo prepararte el catálogo más reciente. ¿Qué información te gustaría conocer primero?'},
      {id:'q2',title:'交付说明',scope:'公共话术',zh:'请告诉我你的收件城市，我会确认对应的交付安排，再把详情发给你。',en:'Please let me know your delivery city. I’ll confirm the delivery arrangements and send you the details.',es:'Dime tu ciudad de entrega, por favor. Confirmaré las opciones y te enviaré los detalles.'},
      {id:'q3',title:'询价跟进',scope:'我的话术',owner:'lin',zh:'你好，想跟进一下之前发给你的资料。你还有哪些希望进一步了解的地方？',en:'Hi, just following up on the information I sent. Is there anything you’d like me to clarify?',es:'Hola, quería dar seguimiento a la información que te envié. ¿Hay algo que te gustaría aclarar?'}
    ]
  };
})();
