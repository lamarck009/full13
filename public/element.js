// 1. 가장 기본적인 커스텀 엘리먼트 클래스 정의
// 커스텀 엘리먼트 클래스 정의 (속성 처리 추가)
class Ytditemrenderer extends HTMLElement {
    constructor() {
      super(); // HTMLElement 생성자 호출
      this._itemsPerRow = null;
      this._isLockup = false;
    }
  
    // 1. 감시할 속성 이름들을 배열로 반환하는 정적 getter 정의
    static get observedAttributes() {
      // 'items-per-row' 와 'lockup' 속성의 변경을 감시하겠다고 선언
      return ['items-per-row', 'lockup'];
    }
  
    // 2. observedAttributes에 등록된 속성이 변경될 때 호출되는 콜백
    attributeChangedCallback(name, oldValue, newValue) {
      if (name === 'items-per-row') {
        const count = parseInt(newValue, 10); //10진수
        if (!isNaN(count)) {
          this._itemsPerRow = count;
        }
      } else if (name === 'lockup') {
        // lockup 속성 변경 처리 (속성의 존재 여부로 boolean 값 처리 가능)
        this._isLockup = newValue !== null; // 속성이 존재하면 true, 제거되면(newValue=null) false
      }
    }
  
    // 3. 요소가 DOM에 연결될 때 초기 속성값 처리 (선택 사항이지만 유용)
    connectedCallback() {
      console.log('ytd-item-renderer가 DOM에 연결됨');
  
      // 초기 'items-per-row' 값 확인 및 적용
      if (this.hasAttribute('items-per-row') && this._itemsPerRow === null) { // 아직 설정 안됐을 때만
        const initialValue = this.getAttribute('items-per-row');
        this.attributeChangedCallback('items-per-row', null, initialValue); // 변경 콜백 재활용
      }
      // 초기 'lockup' 값 확인 및 적용
      if (this.hasAttribute('lockup') && !this._isLockup) { // 아직 설정 안됐을 때만
        this.attributeChangedCallback('lockup', null, ""); // 새 값은 중요하지 않음(존재 여부만 체크)
      }
  
      // 여기에 초기 렌더링 또는 이벤트 리스너 설정 등 추가 로직 가능
    }
    disconnectedCallback() {
      console.log('ytd-item-renderer가 DOM에서 제거됨');
    }
  }
  
  // 커스텀 엘리먼트 등록
  if (!customElements.get('ytd-item-renderer')) {
    customElements.define('ytd-item-renderer', Ytditemrenderer);
  }