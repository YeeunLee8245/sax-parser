import { readFileSync } from "fs";


const KEY_TYPE = {
  TAG: 0,
  ID: 1,
  SELECTOR: 2,
} as const;

type TKeyType = typeof KEY_TYPE[keyof typeof KEY_TYPE]

const TAG_TYPE = {
  CLOSE: 0,
  OPEN: 1,
} as const;

type TTagType = typeof TAG_TYPE[keyof typeof TAG_TYPE]

type TSelector = { key: string; value?: string };

type TTag = {
  type: TTagType;
  name: string;
  // id?: string;
  selectors: TSelector[];
}

export class SAXParser {
  words;
  tagStack: TTag[] = []
  charStack: string[] = []
  
  isFind: boolean = false;
  
  startRegex = /<[^/>]+>/ // <(오른쪽 꺾쇠와 /를 제외한 아무 문자)>
  endRegex = /<\/[^>]+>/ // </(오른쪽 꺾쇠를 제외한 아무 문자)>
  
  selectorRegex = /(\w+)[\t ]*=[\t ]*['"]([^'"]+)['"]/ // (key)="(value)"
  onlyKeySelectorRegex = /^[^='"<>]+$/ // (key)
  
  constructor(file: string) {
    const fileString = readFileSync(file, 'utf-8');
    // this.words = fileString.split(/\s+/); // 띄어쓰기, 탭, 줄바꿈 기준으로 단어 split
    this.words = fileString.split(''); // 띄어쓰기, 탭, 줄바꿈 기준으로 단어 split
  }
    
  #parser(type: TKeyType, key: string) {
    // const tagStack: TTag[] = []
    // const charStack: string[] = []
    let targetString = ''
    
    for (let word of this.words) {
      // characters
      if (word === '<' && targetString) {
        if (targetString.trim().length) { // 공백(띄어쓰기, 탭, 들여쓰기)로만 이루어진 문자열 제외
          // console.log('char', targetString);
          this.#characters(targetString)
        }
        targetString = ''
      }
      
      targetString += word;
      
      // startElement
      if (this.startRegex.test(targetString)) {
        // console.log('startElement', targetString);
        this.#startElement(targetString, type, key)
        targetString = '';
        continue;
      }
      
      // endElement
      if (this.endRegex.test(targetString)) {
        // console.log('endElement', targetString);
        this.#endElement(targetString, type, key)
        targetString = '';
        continue;
      }
    }
    console.log('tag stack', JSON.stringify(this.tagStack));
  }
  
  #setIsFindTag(tag: TTag, type: TKeyType, key: string) {
    switch (type) {
      case KEY_TYPE.TAG: 
        this.isFind = tag.name === key;
        break;
      case KEY_TYPE.ID: 
        const idValue = tag.selectors.find((selector) => selector.key === 'id')?.value;
        this.isFind = idValue === key;
        break;
      case KEY_TYPE.SELECTOR:
        const [targetKey, targetValue] = key.split('=')
        // const { key: targetKey, value: targetValue } = { key: key.split('=')[0] };
        const selector = tag.selectors.find((selector) => selector.key === targetKey);
        if (selector) {
          this.isFind = targetValue === selector.value;
        }
        break;
      default:
        break;
    }
  }
  
  #startElement(element: string, type: TKeyType, key: string) {
    const elementLi = element.replace(/[<>]/g, '').split(' ')
    const tagInfo = elementLi.splice(0, 1); // tagInfo: ['p']
    const tagItem: TTag = {
      type: TAG_TYPE.OPEN,
      name: tagInfo[0],
      selectors: []
    }
    // console.log('test tagItem', tagItem);
    
    let targetString = ''
    for (let w of elementLi) {
      targetString += w;
      
      if (this.selectorRegex.test(targetString)) {
        // console.log('----------test targetString', targetString);
        const match = targetString.match(this.selectorRegex);
        // console.log('match', match && match[1], match && match[2]);
        if (match)
          tagItem.selectors.push({ key: match[1], value: match[2] })
        
        targetString = ''
        continue;
      }
      
      if (this.onlyKeySelectorRegex.test(targetString)) {
        // console.log('------------test onlyKey', targetString)
        tagItem.selectors.push({ key: targetString });
        
        targetString = ''
        continue;
      }
    }
    
    if (!this.isFind) {
      this.#setIsFindTag(tagItem, type, key)
    }
    
    if (this.isFind) {
      console.log('startElement :', element)
    }
    
    this.tagStack.push(tagItem)
  }
  
  #characters(charses: string) {
    if (this.isFind) {
      console.log('startElement :', charses)
    }
  }
  
  #endElement(element: string, type: TKeyType, key: string) {
    // let isEnd = false;
    const elementLi = element.replace(/[</>]/g, '').split(' ')
    const tagInfo = elementLi.splice(0, 1); // tagInfo: ['p']
    // console.log('tagInfo', tagInfo);
    
    if (this.tagStack.at(-1)?.name === tagInfo[0]) {
      if (this.isFind) {
      console.log('endElement', element)
      }
      
      this.tagStack.pop();
      this.isFind = false;
    }
  }
  
  #clearStack() {
    this.tagStack = []
    this.charStack = []
  }
  
  getElementById(keyId: string) {
    this.#parser(KEY_TYPE.ID, keyId);
    this.#clearStack();
  }
  
  querySelectors(keySelectors: string) {
    this.#parser(KEY_TYPE.SELECTOR, keySelectors);
    this.#clearStack();
  }
  
  getElementByTag(keyTag: string) {
    this.#parser(KEY_TYPE.TAG, keyTag);
    this.#clearStack();
  }
}