var router = require('express').Router();

function 로그인했니(요청, 응답, next){
    if (요청.user){
        next()
    } else {
        응답.send('로그인안하셨는데요?')
    }
}

router.use('/pet', 로그인했니);

router.get('/pet', function (요청, 응답) {
    응답.send('펫용품 쇼핑할 수 있는 페이지입니다.');
});

router.get('/beauty', function (요청, 응답) {
    응답.send('뷰티용품 쇼핑할 수 있는 페이지입니다.');
});

module.exports = router;