import { readFileSync } from "fs";


const KEY_TYPE = {
  TAG: 0,
  ID: 1,
  SELECTOR: 2,
} as const;

type TKeyType = typeof KEY_TYPE[keyof typeof KEY_TYPE]

type TSelector = { key: string; value?: string };

type TTag = {
  isFind: boolean;
  name: string;
  selectors: TSelector[];
}

export class SAXParser {
  words;
  tagStack: TTag[] = []
  resultArr: string[] = []
  
  isPrint: boolean = false;
  
  startRegex = /<[^/>]+>/ // <(오른쪽 꺾쇠와 /를 제외한 아무 문자)>
  endRegex = /<\/[^>]+>/ // </(오른쪽 꺾쇠를 제외한 아무 문자)>
  
  selectorRegex = /(\w+)[\t ]*=[\t ]*['"]([^'"]+)['"]/ // (key)="(value)"
  onlyKeySelectorRegex = /^[^='"<>]+$/ // (key)
  
  constructor(file: string) {
    const fileString = readFileSync(file, 'utf-8');
    this.words = fileString.split(''); // 문자 하나하나 탐색을 위해 split
  }
    
  #parser(type: TKeyType, key: string) {
    let targetString = ''
    
    for (let word of this.words) { // 문자 하나씩 탐색
      // characters
      if (word === '<' && targetString) { // 닫힘 태그 꺽쇠 이전 문자열 체크(문자열이 존재하는 경우)
        if (targetString.trim().length) { // 공백(띄어쓰기, 탭, 들여쓰기)로만 이루어진 문자열 제외
          this.#characters(targetString)
        }
        targetString = ''
      }
      
      targetString += word;
      
      // startElement
      if (this.startRegex.test(targetString)) { // 시작 태그 체크
        this.#startElement(targetString, type, key)
        targetString = '';
        continue;
      }
      
      // endElement
      if (this.endRegex.test(targetString)) { // 닫힘 태그 체크
        this.#endElement(targetString)
        targetString = '';
        continue;
      }
    }
    return this.resultArr;
  }
  
  #setIsFindTag(tagName: string, selectors: TSelector[], type: TKeyType, key: string):boolean {
    switch (type) {
      case KEY_TYPE.TAG: 
        return tagName === key;
      case KEY_TYPE.ID: 
        const idValue = selectors.find((selector) => selector.key === 'id')?.value;
       return idValue === key;
      case KEY_TYPE.SELECTOR:
        const [targetKey, targetValue] = key.replace(/[\[\]""'']/g, '').split('=')
        const selector = selectors.find((selector) => selector.key === targetKey);
        if (selector) {
          return targetValue === selector.value;
        }
        break;
      default:
        break;
    }
    return false;
  }
  
  #startElement(element: string, type: TKeyType, key: string) {     
    const elementLi = element.replace(/[<>]/g, '').split(' '); // 꺽쇠 제거, 단어별 구분
    
    let isFind = false;
    const tagName = elementLi.splice(0, 1)[0]; // tagInfo: 'p'
    const selectors = []
    
    let targetString = ''
    for (let w of elementLi) { // 단어 하나씩 탐색
      targetString += w;
      
      if (this.selectorRegex.test(targetString)) { // (key)="(value)" 형태 체크
        // key=value 형태로 분리
        const match = targetString.match(this.selectorRegex);
        if (match)
          selectors.push({ key: match[1], value: match[2] })
        
        targetString = ''
        continue;
      }
      
      if (this.onlyKeySelectorRegex.test(targetString)) { // (key) 형태 체크
        selectors.push({ key: targetString });
        
        targetString = ''
        continue;
      }
    }
    
    isFind = this.#setIsFindTag(tagName, selectors, type, key) // 태그 정보 기반 매칭
    
    if (isFind) { //(this.tagStack.filter((tag) => tag.isFind).length > 0 || isFind) {
      this.isPrint = true;
      this.resultArr.push(element);
    } else {
      this.isPrint = false;
    }
    
    // this.tagStack.push({
    //   isFind,
    //   name: tagName,
    //   selectors
    // })
  }
  
  #characters(charses: string) {
    if (this.isPrint) {
      this.resultArr[this.resultArr.length-1] += charses
    }
  }
  
  #endElement(element: string) {
    // const elementLi = element.replace(/[</>]/g, '').split(' ')
    // const tagInfo = elementLi.splice(0, 1)[0]; // tagInfo: ['p']
    
    if (this.isPrint) {
      this.resultArr[this.resultArr.length - 1] += element;
      this.isPrint = false; // 중첩 tag 적용 시엔 제거
    }
    
    // const tagStackTop = this.tagStack.at(-1);
    // if (tagStackTop?.name === tagInfo) {
    //  if (tagStackTop?.isFind) {
    //   this.isPrint = false;
    //  }
      // this.tagStack.pop()
    // }
  }
  
  #clearStack() {
    // this.tagStack = []
    this.resultArr = []
  }
  
  getElementById(keyId: string): string[] {
    const result = this.#parser(KEY_TYPE.ID, keyId);
    this.#clearStack();
    return result;
  }
  
  querySelectors(keySelectors: string): string[] {
    const result = this.#parser(KEY_TYPE.SELECTOR, keySelectors);
    this.#clearStack();
    return result;
  }
  
  getElementByTag(keyTag: string): string[] {
    const result = this.#parser(KEY_TYPE.TAG, keyTag);
    this.#clearStack();
    return result;
  }
}
