/**
 * 전체 코드 재구성: 논리적 흐름 및 기능별 그룹화
 */

// =============================================
// 1. 전역 상태 변수 및 상수 (Global State & Constants)
// =============================================
let isLoading = false;        // 무한 스크롤 중복 로딩 방지 플래그
let currentPage = 1;          // 무한 스크롤 현재 페이지 번호
let resizeTimer;              // 반응형 그리드 디바운싱 타이머 ID
//검색+섹션 필터링 로직
let currentSelectedCategory = 'all'; // 현재 선택된 카테고리 (기본값 'all')
let currentSearchTerm = '';        // 현재 검색어 (기본값 비어있음)

// =============================================
// 2. 유틸리티 함수 (Utility Functions)
// =============================================

/**
 * 함수 실행 빈도를 조절하는 디바운스 함수
 * @param {Function} func - 디바운스 적용할 함수
 * @param {number} delay - 지연 시간 (밀리초)
 * @returns {Function} - 디바운스가 적용된 새로운 함수
 */
function debounce(func, delay) {
  return function() {
    const context = this; // 'this' 컨텍스트 저장
    const args = arguments; // 함수 인자 저장
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      func.apply(context, args); // 저장된 컨텍스트와 인자로 함수 실행
    }, delay);
  };
}

// =============================================
// 3. 코어 로직: 비디오 아이템 DOM 생성 (Video Item DOM Creation)
// =============================================

/**
 * 서버에서 받은 '하나'의 비디오 데이터로 '하나'의 아이템 DOM 요소를 생성
 * @param {object} videoData - 서버로부터 받은 비디오 데이터 객체 (ID, TITLE, IMG, CATEGORY, CHIMG, CH, VIEWS 등 포함)
 * @returns {HTMLElement} - 생성된 ytd-item-renderer 요소 (<div class="item-container">)
 */
const createVideoItemElement = (videoData) => {
  // 1. 부모 컨테이너 생성 (<ytd-item-renderer>)
  const pDiv = document.createElement('ytd-item-renderer');
  pDiv.classList.add('item-container');
  pDiv.style.display = 'flex'; // 초기에는 보이도록 설정 (filterVideos에서 제어)
  pDiv.style.flexDirection = 'column';
  pDiv.setAttribute('items-per-row', '6'); // 초기값 설정 (updateGridColumns에서 변경될 수 있음)
  pDiv.setAttribute('lockup', 'true');
  pDiv.dataset.videoId = videoData.ID;
  pDiv.dataset.category = videoData.CATEGORY; // 필터링을 위한 카테고리 데이터 속성

  // 2. 썸네일 영역 생성
  const thumbnailDiv = document.createElement('div');
  thumbnailDiv.classList.add('item-thumbnail');
  const img = document.createElement('img');
  img.classList.add('img-thumbnail');
  img.src = videoData.IMG;
  img.alt = videoData.TITLE || `Video ${videoData.ID}`;
  img.loading = 'lazy'; // 이미지 지연 로딩
  thumbnailDiv.appendChild(img);

  // 3. 메타데이터 영역 생성 (썸네일 아래 정보 영역)
  const metadataContainer = document.createElement('div');
  metadataContainer.classList.add('item-metadata');

  // 3a. 채널 이미지 + 제목 라인 컨테이너
  const titleAndImgContainer = document.createElement('div');
  titleAndImgContainer.classList.add('chimg_and_title');

  if (videoData.CHIMG) {
    const channelImg = document.createElement('img');
    channelImg.classList.add('channel-thumbnail');
    channelImg.src = videoData.CHIMG;
    channelImg.alt = `${videoData.CH || 'Channel'} thumbnail`;
    channelImg.loading = 'lazy';
    titleAndImgContainer.appendChild(channelImg);
  }

  // 3b. 제목 + 채널명 + 조회수 컨테이너
  const detailsContainer = document.createElement('div');
  detailsContainer.classList.add('another_data');

  const titleDiv = document.createElement('div');
  titleDiv.classList.add('item-name');
  titleDiv.textContent = videoData.TITLE;
  detailsContainer.appendChild(titleDiv);

  if (videoData.CH) {
    const channelName = document.createElement('span');
    channelName.classList.add('channel-name');
    channelName.textContent = videoData.CH;
    detailsContainer.appendChild(channelName);
  }

  const viewCountDiv = document.createElement('div');
  viewCountDiv.classList.add('item-views');
  viewCountDiv.textContent = videoData.VIEWS !== null && videoData.VIEWS !== undefined
    ? `조회수 ${videoData.VIEWS.toLocaleString()}회`
    : '조회수 정보 없음';
  detailsContainer.appendChild(viewCountDiv);

  // 3c. 메타데이터 요소 조립
  metadataContainer.appendChild(titleAndImgContainer);
  metadataContainer.appendChild(detailsContainer);

  // 4. 최종 아이템 조립
  pDiv.appendChild(thumbnailDiv);
  pDiv.appendChild(metadataContainer);

  return pDiv;
};

// =============================================
// 4. 코어 로직: 무한 스크롤 데이터 로딩 (Infinite Scroll Data Loading)
// =============================================

/**
 * 서버 API에서 비디오 데이터를 비동기적으로 가져와 화면에 표시 (무한 스크롤용)
 */
const fetchAndDisplayFrontendItems = async () => {
  if (isLoading) return; // 이미 로딩 중이면 중복 실행 방지

  isLoading = true;
  console.log(`프론트엔드: ${currentPage} 페이지 로딩 시작...`);
  const loaderElement = document.getElementById('loader'); // 로더 요소 여기서도 참조 가능

  try {
    const response = await fetch(`/api/video01?page=${currentPage}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    const videoArray = result.data; // 실제 데이터 배열
    console.log(`페이지 ${currentPage}: 로딩된 데이터 수:`, videoArray.length);

    if (videoArray && videoArray.length > 0) {
      const fragment = document.createDocumentFragment(); // DOM 조작 최적화
      videoArray.forEach(videoData => {
        const newItemElement = createVideoItemElement(videoData); // 각 데이터로 DOM 요소 생성
        fragment.appendChild(newItemElement);
      });

      // video-container 요소를 찾아 fragment 삽입
      const container = document.getElementById('video-container');
      if (container && loaderElement) {
        container.insertBefore(fragment, loaderElement); // 로더 요소 바로 앞에 삽입
      } else {
         console.error('#video-container or #loader not found for inserting items.');
      }
      currentPage++; // 다음 페이지 번호 증가
    } else {
      console.log('프론트엔드: 더 이상 로드할 데이터가 없습니다.');
      // 데이터가 없으면 로더를 숨기거나 Observer를 중단할 수 있음 (현재는 유지)
      // if (loaderElement) loaderElement.style.display = 'none';
      // observer.unobserve(loaderElement); // 필요 시 관찰 중단
    }
  } catch (error) {
    console.error('프론트엔드: 데이터를 가져오는 중 오류 발생:', error);
    if (loaderElement) loaderElement.textContent = '데이터 로딩 실패'; // 오류 메시지 표시
  } finally {
    isLoading = false; // 로딩 상태 해제
  }
};

// =============================================
// 5. 코어 로직: Intersection Observer 설정 (Infinite Scroll Trigger)
// =============================================

/**
 * Intersection Observer 콜백 함수: 요소가 뷰포트에 들어오면 데이터 로딩 시도
 * @param {IntersectionObserverEntry[]} entries - 관찰 대상 요소 배열
 * @param {IntersectionObserver} observer - 옵저버 인스턴스
 */
const handleIntersection = (entries, observer) => {
  entries.forEach(entry => {
    // 요소가 화면에 보이고 (isIntersecting), 로딩 중이 아닐 때(!isLoading) 다음 페이지 로드
    if (entry.isIntersecting && !isLoading) {
      fetchAndDisplayFrontendItems();
    }
  });
};

// Intersection Observer 옵션 설정
const observerOptions = {
  root: null,           // 뷰포트 기준
  rootMargin: '100px',  // 뷰포트 감지 영역 100px 확장
  threshold: 0          // 요소가 1픽셀이라도 보이면 콜백 실행
};

// Intersection Observer 인스턴스 생성 (실제 관찰 시작은 DOMContentLoaded에서)
const observer = new IntersectionObserver(handleIntersection, observerOptions);

// =============================================
// 6. 코어 로직: 반응형 그리드 컬럼 계산 및 업데이트 (Responsive Grid Logic)
// =============================================

/**
 * 화면 너비에 따라 한 줄에 표시할 아이템 개수를 결정
 * @param {number} width - 현재 뷰포트 너비
 * @returns {number} - 한 줄당 아이템 개수
 */
function determineItemsPerRowValue(width) {
  if (width < 600) return 2;
  if (width < 900) return 3;
  if (width < 1200) return 4;
  return 6; // 기본값 또는 가장 넓은 경우
}

/**
 * 그리드 컨테이너의 CSS 변수('--items-per-row')와 각 아이템의 속성을 업데이트
 */
function updateGridColumns() {
  const viewportWidth = window.innerWidth;
  const newItemCount = determineItemsPerRowValue(viewportWidth);
  const gridContainer = document.getElementById('video-section-container'); // 메인 콘텐츠 영역이 그리드 컨테이너 역할

  if (!gridContainer) {
    // console.warn('#video-section-container 요소를 찾을 수 없습니다. (Grid update skipped)');
    return; // DOMContentLoaded 전에 호출될 수 있으므로 경고 대신 조용히 종료 가능
  }

  // 1. 그리드 컨테이너의 CSS 변수 업데이트 (CSS에서 이 변수를 사용해야 함)
  gridContainer.style.setProperty('--items-per-row', newItemCount);

  // 2. 각 비디오 아이템의 'items-per-row' 속성 업데이트 (필요한 경우)
  //    (CSS 변수만으로 제어한다면 이 부분은 생략 가능)
  const elementsToUpdate = gridContainer.querySelectorAll('ytd-item-renderer');
  elementsToUpdate.forEach(element => {
    element.setAttribute('items-per-row', newItemCount.toString());
  });
}

// =============================================
// 7. 코어 로직: 토픽 필터링 (Topic Filtering Logic)
// =============================================

/**
 * 선택된 카테고리에 따라 비디오 아이템 표시/숨김 처리
 * @param {string} category - 선택된 카테고리 ('all' 또는 특정 카테고리명)
 * @param {string} containerSelector - 비디오 아이템들을 포함하는 컨테이너의 CSS 선택자
 */
/**
 * 현재 선택된 카테고리와 검색어를 모두 고려하여 비디오 아이템 표시/숨김 처리
 */
function applyFilters() {
  const container = document.querySelector('#video-section-container');
  if (!container) {
      console.error("Filter container '#video-section-container' not found in applyFilters.");
      return;
  }
  const videoItems = container.querySelectorAll('ytd-item-renderer.item-container');

  console.log(`Applying filters: Category='<span class="math-inline">\{currentSelectedCategory\}', Search\='</span>{currentSearchTerm}'`); // 디버깅 로그

  videoItems.forEach(item => {
      const itemCategory = item.dataset.category; // 아이템의 카테고리
      const titleElement = item.querySelector('.item-name'); // 아이템의 제목 요소

      // 조건 1: 카테고리 일치 여부 확인
      const categoryMatch = (currentSelectedCategory === 'all' || itemCategory === currentSelectedCategory);

      // 조건 2: 텍스트 검색어 일치 여부 확인
      let textMatch = (currentSearchTerm === ''); // 검색어가 비어있으면 무조건 true
      if (!textMatch && titleElement) { // 검색어가 있고, 제목 요소도 있을 때만 .includes() 확인
          const titleText = titleElement.textContent.toLowerCase();
          textMatch = titleText.includes(currentSearchTerm);
      } else if (!textMatch && !titleElement) { // 검색어가 있는데 제목 요소가 없으면 false
          textMatch = false;
      }

      // 최종 결정: 두 조건이 모두 참일 때만 아이템을 보여줌
      if (categoryMatch && textMatch) {
          item.style.display = 'flex';
      } else {
          item.style.display = 'none';
      }
  });
}


// =============================================
// 8. 초기화 및 이벤트 리스너 설정 (Initialization & Event Listeners on DOM Ready)
// =============================================
document.addEventListener('DOMContentLoaded', () => {

  // --- 필수 DOM 요소 선택 ---
  const container = document.getElementById('video-container');       // 비디오 아이템들이 들어갈 곳
  const loader = document.getElementById('loader');                 // 무한 스크롤 트리거
  const toggleButton = document.getElementById('head-item-left-menu'); // 사이드바 토글 버튼
  const sidenav = document.querySelector('#sidenav');                 // 사이드바 요소
  const mainContent = document.querySelector('#video-section-container'); // 메인 콘텐츠 영역 (그리드 컨테이너)
  const topicButtonsContainer = document.getElementById('topic-bar-items'); // 토픽 버튼들을 감싸는 요소
  const searchInput = document.getElementById('video-search-input'); // 검색창
  const searchButton = document.getElementById('SearchButton');      // 검색 실행 버튼

  // --- 초기 설정값 가져오기 ---
  let navWidthCollapsed = '72px'; // 기본값 설정 (CSS 변수 로드 실패 대비)
  let navWidthExpanded = '240px'; // 기본값 설정
  try {
    navWidthCollapsed = getComputedStyle(document.documentElement).getPropertyValue('--nav-width-collapsed').trim() || navWidthCollapsed;
    navWidthExpanded = getComputedStyle(document.documentElement).getPropertyValue('--nav-width-expanded').trim() || navWidthExpanded;
  } catch (e) {
    console.warn('Failed to get CSS variables for nav width.', e);
  }


  // --- 초기 UI 상태 설정 ---
  if (mainContent) {
    mainContent.style.marginLeft = navWidthCollapsed; // 초기 사이드바 상태에 맞춰 마진 설정
  } else {
    console.error('#video-section-container not found for initial setup.');
  }


  // --- 이벤트 리스너 등록 ---

  // 1. 사이드바 토글 리스너
  if (toggleButton && sidenav && mainContent) {
    toggleButton.addEventListener('click', () => {
      sidenav.classList.toggle('open');
      mainContent.style.marginLeft = sidenav.classList.contains('open') ? navWidthExpanded : navWidthCollapsed;
    });
  } else {
    console.error('Sidebar toggle elements not found. Listener not attached.');
  }

  // 2. 토픽 필터링 리스너 (이벤트 위임 사용)
  if (topicButtonsContainer) {
    topicButtonsContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('topic-item')) {
        const selectedCategory = e.target.dataset.category;
        topicButtonsContainer.querySelectorAll('.topic-item').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        // 비디오 필터링 함수 호출
        // ✨ 상태 업데이트 및 통합 필터 함수 호출 ✨
        currentSelectedCategory = selectedCategory; // 상태 변수 업데이트
        applyFilters();                           // 통합 필터 적용
        console.log(`Category selected: ${selectedCategory}`);
      }
    });
  } else {
    console.error('#topic-bar-items container not found. Filter listener not attached.');
  }

  // 3. 검색창 필터링 리스너
  if (searchButton&&searchInput){
    searchButton.addEventListener('click', ()=>{
      console.log("Searchbutton 클릭 이벤트 발생!")
    const searchTerm = searchInput.value.trim().toLowerCase(); //trim 공백제거 tolowercase 소문자변형
    // ✨ 상태 업데이트 및 통합 필터 함수 호출 ✨
    currentSearchTerm = searchTerm; // 상태 변수 업데이트
    applyFilters();                 // 통합 필터 적용
    console.log(`검색 실행됨. 검색어: "${searchTerm}"`);
    })
  }

  // 4. 반응형 그리드 리사이즈 리스너
  window.addEventListener('resize', debounce(updateGridColumns, 250)); // 디바운스 시간 조정 (예: 250ms)

  //


  // --- 초기 동작 실행 ---

  // 1. 초기 그리드 컬럼 설정
  updateGridColumns();

  // 2. 무한 스크롤 초기 데이터 로드 및 Observer 시작
  if (loader && container) {
    fetchAndDisplayFrontendItems(); // 첫 페이지 데이터 로드
    observer.observe(loader);       // 로더 요소 관찰 시작
  } else {
    console.error('#loader or #video-container element not found. Infinite scroll setup failed.');
  }

}); // End of DOMContentLoaded

// 전역 스코프에 불필요하게 남아있던 observer.observe(loader) 호출은 제거됨.