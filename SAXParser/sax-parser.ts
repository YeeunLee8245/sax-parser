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
    this.words = fileString.split(''); // 띄어쓰기, 탭, 줄바꿈 기준으로 단어 split
  }
    
  #parser(type: TKeyType, key: string) {
    let targetString = ''
    
    for (let word of this.words) {
      // characters
      if (word === '<' && targetString) {
        if (targetString.trim().length) { // 공백(띄어쓰기, 탭, 들여쓰기)로만 이루어진 문자열 제외
          this.#characters(targetString)
        }
        targetString = ''
      }
      
      targetString += word;
      
      // startElement
      if (this.startRegex.test(targetString)) {
        this.#startElement(targetString, type, key)
        targetString = '';
        continue;
      }
      
      // endElement
      if (this.endRegex.test(targetString)) {
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
    const elementLi = element.replace(/[<>]/g, '').split(' ');
    
    let isFind = false;
    const tagName = elementLi.splice(0, 1)[0]; // tagInfo: 'p'
    const selectors = []
    
    let targetString = ''
    for (let w of elementLi) {
      targetString += w;
      
      if (this.selectorRegex.test(targetString)) {
        const match = targetString.match(this.selectorRegex);
        if (match)
          selectors.push({ key: match[1], value: match[2] })
        
        targetString = ''
        continue;
      }
      
      if (this.onlyKeySelectorRegex.test(targetString)) {
        selectors.push({ key: targetString });
        
        targetString = ''
        continue;
      }
    }
    
    isFind = this.#setIsFindTag(tagName, selectors, type, key)
    
    if (this.tagStack.filter((tag) => tag.isFind).length > 0 || isFind) {
      this.isPrint = true;
      this.resultArr.push(element);
    } else {
      this.isPrint = false;
    }
    
    this.tagStack.push({
      isFind,
      name: tagName,
      selectors
    })
  }
  
  #characters(charses: string) {
    if (this.isPrint) {
      this.resultArr[this.resultArr.length-1] += charses
    }
  }
  
  #endElement(element: string) {
    const elementLi = element.replace(/[</>]/g, '').split(' ')
    const tagInfo = elementLi.splice(0, 1)[0]; // tagInfo: ['p']
    
    if (this.isPrint) {
      this.resultArr[this.resultArr.length - 1] += element;
    }
    
    const tagStackTop = this.tagStack.at(-1);
    if (tagStackTop?.name === tagInfo) {
     if (tagStackTop?.isFind) {   
      this.isPrint = false;
     }
      this.tagStack.pop()
    }
  }
  
  #clearStack() {
    this.tagStack = []
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
