// server.js (전체 내용)
const express = require('express');
const sqlite3 = require('sqlite3').verbose(); // ✨ sqlite3 모듈 가져오기 (.verbose()는 디버깅에 도움)

// 2. Express 애플리케이션 생성
const app = express();
const port = 3000; // 서버 포트 설정
// ✨ public 폴더를 정적 파일 제공 폴더로 설정
app.use(express.static('public'));
// --- ✨ SQLite 데이터베이스 연결 ---
const path = require('path'); // path 모듈 추가

console.log('Node.js 스크립트 실행 디렉토리 (CWD):', process.cwd());
const dbFile = './sql.db';
console.log('DB 파일 절대 경로 시도:', path.resolve(dbFile)); // 절대 경로 확인
// 데이터베이스 파일에 연결 (파일이 없으면 자동으로 생성됨)
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('DB 연결 오류:', err.message);
  } else {
    console.log(`${dbFile} 에 성공적으로 연결되었습니다.`);
    // --- ✨ 테이블 생성 (서버 시작 시 실행) ---
    // 'video01' 테이블이 존재하지 않으면 새로 생성합니다.
    // server.js 내부, db.run(CREATE TABLE ...) 부분을 아래처럼 수정

      db.run(`CREATE TABLE IF NOT EXISTS video01 (
        ID TEXT PRIMARY KEY,      -- 고유 ID (텍스트, 기본 키)
        TITLE TEXT NOT NULL,     -- 제목 (텍스트, 필수)
        IMG TEXT,                -- 썸네일 이미지 URL (텍스트)
        CH TEXT,                 -- 채널 이름 (텍스트)
        CHIMG TEXT,              -- 채널 이미지 URL (텍스트)
        VIEWS INTEGER DEFAULT 0  -- 조회수 (정수, 기본값 0)
      )`, (err) => {
        if (err) {
          console.error('테이블 생성 오류:', err.message);
        } else {
          console.log("'video01' 테이블이 새 스키마로 성공적으로 준비되었습니다.");
  }
});
  }
});


app.get('/api/video01', (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /api/video01 요청 받음 (page: ${req.query.page})`);

  // 페이지네이션 처리
  const page = parseInt(req.query.page || '1');
  const limit = 30; // 한 페이지당 아이템 수 (원하는 값으로 설정)
  const offset = (page - 1) * limit; // OFFSET은 건너뛸 아이템 수

  const sql = `SELECT * FROM video01 ORDER BY ID LIMIT ? OFFSET ?`;   // ✨ DB에서 데이터 조회하는 SQL 쿼리
  const params = [limit, offset]; // 파라미터 배열

  // --- 👇 로그 추가 ---
  console.log('데이터베이스 쿼리 실행 전');
  console.log('SQL:', sql);
  console.log('Params:', params);
  // --- 👆 로그 추가 ---

  db.all(sql, params, (err, rows) => {
    // --- 👇 콜백 내부 로그 추가 ---
    console.log('데이터베이스 쿼리 콜백 실행됨');
    // --- 👆 콜백 내부 로그 추가 ---

    if (err) {
      // --- 👇 오류 로그 강화 ---
      console.error('DB 조회 중 명백한 오류 발생:', err.message);
      console.error('오류 스택:', err.stack); // 상세 오류 스택 출력
      // --- 👆 오류 로그 강화 ---
      res.status(500).json({ message: '데이터베이스 조회 중 오류가 발생했습니다.' });
    } else {
      // --- 👇 성공 시 받은 데이터 로그 ---
      console.log('DB 조회 성공. 받은 rows:', rows); // 실제 받은 rows 내용 확인
      // --- 👆 성공 시 받은 데이터 로그 ---
      console.log(`페이지 ${page}에 대해 ${rows.length}개의 데이터를 응답합니다.`);

      res.json({
        message: '영상 목록 조회 성공',
        currentPage: page,
        hasNextPage: rows.length === limit,
        data: rows
      });
    }
  });
  // --- 👇 db.all 호출 직후 로그 (비동기 주의) ---
  // console.log('db.all 호출 직후 (콜백 실행 전일 수 있음)');
  // --- 👆 이 로그는 콜백보다 먼저 찍힐 수 있습니다 ---
});

// --- 서버 시작 ---
app.listen(port, () => {
  console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
  console.log('프론트엔드에서 이 주소로 API 요청을 보내야 합니다.');
});