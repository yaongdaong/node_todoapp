const express = require('express');
const app = express();
// 소켓추가
const http = require('http').createServer(app);
const {Server} = require('socket.io');
const io = new Server(http);

app.use(express.urlencoded({extended : true}));

const MongoClient = require('mongodb').MongoClient;
const methodOverride = require('method-override')
app.use(methodOverride('_method'))

app.set('view engine', 'ejs');
app.use('/public', express.static('public'));
require('dotenv').config()

app.use(express.json());
var cors = require('cors')
app.use(cors());

var db;
MongoClient.connect(process.env.DB_URL, function(에러, client){
    if (에러) return console.log(에러)

    db = client.db('todoapp');
    app.db = db;
    // db.collection('post').insertOne({이름 : 'John', 나이 : 20, _id : 180}, function(에러, 결과){
    //     console.log('저장완료');
    // });

    http.listen(8080, function(){
        console.log('listening on 8080')
    });
});
// 웹소켓
app.get('/socket', function(요청, 응답){
    응답.render('socket.ejs')
})
io.on('connection', function(socket){
    console.log('유저접속됨');

    socket.on('room1-send', function(data){      
        io.to('room1').emit('broadcast', data) 
    }); 

    socket.on('joinroom', function(data){      
        socket.join('room1');
    }); 

    socket.on('user-send', function(data){      
        io.emit('broadcast', data) 
    });   
})

// 파일올리기
app.get('/', function (요청, 응답) {
    응답.render('index.ejs');
    //응답.sendFile(__dirname + '/index.html');
});

app.get('/write', function (요청, 응답) {
    응답.render('write.ejs');
    //응답.sendFile(__dirname + '/write.html');
});

app.get('/list', function(요청, 응답){
    db.collection('post').find().toArray(function(에러, 결과){
        console.log(결과);
        응답.render('list.ejs', { posts : 결과 });
    });
});

app.get('/detail/:id', function(요청, 응답){
    db.collection('post').findOne({_id : parseInt(요청.params.id)}, function(에러, 결과){
        console.log(결과);
        응답.render('detail.ejs',{ data : 결과 });
    })
    
})

app.get('/edit/:id', function(요청, 응답){
    db.collection('post').findOne({_id : parseInt(요청.params.id)}, function(에러, 결과){
        console.log(결과)
        응답.render('edit.ejs', { post : 결과 })
    })
    
})

app.put('/edit', function(요청, 응답){
    db.collection('post').updateOne({ _id : parseInt(요청.body.id) },{ $set : { 제목: 요청.body.title, 날짜: 요청.body.date }}, function(에러, 결과){
        console.log('수정완료')
        응답.redirect('/list')
    })
});

// 로그인 & 세션 생성 라이브러리 설치
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

app.use(session({secret : '비밀코드', resave : true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());

// 아디비번체크
passport.use(new LocalStrategy({
    usernameField: 'id',
    passwordField: 'pw',
    session: true,
    passReqToCallback: false,
}, function(입력한아이디, 입력한비번, done){
    console.log(입력한아이디, 입력한비번);
    db.collection('login').findOne({id: 입력한아이디}, function(에러, 결과){
        if(에러) return done(에러)
        if(!결과) return done(null, false, {message : '존재하지않는 아이디요'})
        if(입력한비번 == 결과.pw){
            return done(null, 결과)
        } else{
            return done(null, false, {message : '비번틀렸어요'})
        }
    })
}));

// 세션 저장(로그인 성공시 발동)
passport.serializeUser(function(user, done){
    done(null, user.id)
});
// 이 세션데이터 가진 사람을 DB에서 찾아주세요(마이페이지 접속시 발동)
passport.deserializeUser(function(아이디, done){
    db.collection('login').findOne({id : 아이디}, function(에러, 결과){
    done(null, 결과)
    })    
});

// 로그인
app.get('/login', function(요청, 응답){
    응답.render('login.ejs')
});

app.post('/login', passport.authenticate('local', {
    failureRedirect : '/fail'
}), function(요청, 응답){
    응답.redirect('/')
});

app.get('/mypage', 로그인했니, function(요청, 응답){
    console.log(요청.user);
    응답.render('mypage.ejs', {사용자 : 요청.user})
})

function 로그인했니(요청, 응답, next){
    if (요청.user){
        next()
    } else {
        응답.send('로그인안하셨는데요?')
    }
}


// 회원가입
app.post('/register', function(요청, 응답){
    db.collection('login').insertOne( { id : 요청.body.id, pw : 요청.body.pw }, function(에러, 결과) {
        응답.redirect('/')
        // 아이디 중복확인, 알바벳과 숫자로 구성되었는지 확인, 암호화
    })
})
// 글 등록
app.post('/add', function(요청, 응답){
    응답.send('전송완료');
    db.collection('counter').findOne({name : '게시물갯수'}, function(에러, 결과){
        console.log(결과.totalPost)
        var 총게시물갯수 = 결과.totalPost;
        var 저장할거 = { _id : 총게시물갯수 + 1, 작성자 : 요청.user._id, 제목 : 요청.body.title, 날짜 : 요청.body.date}
        db.collection('post').insertOne(저장할거, function (에러, 결과) {
            console.log('저장완료');   
            db.collection('counter').updateOne({name : '게시물갯수'},{ $inc : {totalPost:1} },function(에러, 결과){
                if(에러){return console.log(에러)}
            })
        });    
  
    });
});
// 글삭제
app.delete('/delete', function(요청, 응답){
    console.log(요청.body);
    요청.body._id = parseInt(요청.body._id);

    var 삭제할데이터 = { _id : 요청.body._id, 작성자 : 요청.user._id}
    db.collection('post').deleteOne(삭제할데이터, function(에러, 결과){
        console.log('삭제완료');
        if (결과) {console.log(결과)}
        응답.status(200).send({message:'성공했습니다'});
    })
})

// 검색
app.get('/search', (요청, 응답)=>{
    var 검색조건 = [
        {
            $search: {
                index: 'titleSearch',
                text: {
                    query: 요청.query.value,
                    path: "제목" // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
                }
            }
        },
        { $sort : { _id : 1 } },
        { $project : { 제목: 1, _id: 0, score: { $meta: "searchScore" } } }
    ]
    db.collection('post').aggregate(검색조건).toArray((에러, 결과)=>{
        console.log(결과)
        응답.render('search.ejs', {posts:결과})
    })
})
// app.use는 미들웨어(요청과 응답사이에 실행되는 코드)
app.use('/shop',require('./routes/shop.js'));
app.use('/board/sub',require('./routes/board.js'));

//multer 라이브러리
let multer = require('multer');
var storage = multer.diskStorage({
    destination : function(req, file, cb){
        cb(null, './public/image')
    },
    filename : function(req, file, cb){
        cb(null, file.originalname)
    }
});
var upload = multer({storage : storage});
// 업로드한 파일의 확장자 필터로 원하는 파일만 거르는 법
var path = require('path');
var upload = multer({
    storage: storage,
    fileFilter: function(req, file, callback) {
        var ext = path.extname(file.originalname);
        if(ext !=='.png' && ext !=='.jpg'&& ext !== '.jpeg') {
            return callback(new Error("PNG, JPG만 업로드하세요"))
        }
        callback(null, true)
    },
    limits:{
        fileSize: 1024 *1024
    }
});
//업로드
app.get('/upload', function(요청, 응답){
    응답.render('upload.ejs')
})
// 업로드 완료
app.post('/upload', upload.single('프로필'), function(요청, 응답){
    응답.send('업로드완료')
});
// 기능개발 : 파일 여러개, 파일이름변경해서저장, 파일용량제한
// 업로드한 파일 보기
app.get('/image/:imageName', function(요청, 응답){
    응답.sendFile(__dirname + '/public/image/'  + 요청.params.imageName)
})
// 채팅
const { ObjectId } = require('mongodb');
app.post('/chatroom', 로그인했니, function(요청, 응답){
    var 저장할거 = {
        title : '채팅방',
        member : [ObjectId(요청.body.당한사람id), 요청.user._id],
        date : new Date()
    }
    db.collection('chatroom').insertOne(저장할거).then((결과)=>{
        응답.send('성공')
    })
})

app.get('/chat', 로그인했니, function(요청, 응답){
    db.collection('chatroom').find({member : 요청.user._id }).toArray().then((결과)=>{
        console.log(결과);
        응답.render('chat.ejs', {data : 결과})
    })   
});
// 댓글 쓰기
app.post('/message', 로그인했니, function(요청, 응답){
    var 저장할거 = {
        parent : 요청.body.parent,
        content : 요청.body.content,
        userid : 요청.user._id,
        date : new Date(),
    }
    db.collection('message').insertOne(저장할거).then(()=>{
        console.log('DB저장성공');
        응답.send('DB저장성공')
    })   
});
// 실시간 소통
app.get('/message/:id', 로그인했니, function(요청, 응답) {
    응답.writeHead(200, {
        "Connection" : "keep-alive",
        "Content-Type" : "text/event-stream",
        "Cache-Control" : "no-cache",
    });
    db.collection('message').find({ parent : 요청.params.id }).toArray().then((결과)=>{
        응답.write('event: test\n');
        응답.write('data: '+ JSON.stringify(결과) + '\n\n');
    })
    
    const pipeline = [
        { $match: {'fullDocument.parent' : 요청.params.id } }
    ];
    const collection = db.collection('message');
    const changeStream = collection.watch(pipeline);
    changeStream.on('change', (result)=>{
        응답.write('event: test\n');
        응답.write('data: '+ JSON.stringify([result.fullDocument]) + '\n\n');
    });
});