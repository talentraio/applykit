import { describe, expect, it } from 'vitest';
import {
  COVER_LETTER_PROMPT_LOCALES,
  getCoverLetterLanguagePack,
  getCoverLetterLanguagePackByLocale
} from '../../../../server/services/llm/prompts/cover-letter/language-packs';

describe('cover-letter language packs', () => {
  it('exposes all prompt locale artifacts including future locales', () => {
    expect(COVER_LETTER_PROMPT_LOCALES).toEqual(['en', 'da-DK', 'uk-UA']);
  });

  it('resolves active generation locale packs', () => {
    expect(getCoverLetterLanguagePack('en').label).toBe('English');
    expect(getCoverLetterLanguagePack('en').requiresGrammaticalGender).toBe(false);
    expect(getCoverLetterLanguagePack('da-DK').label).toBe('Danish');
    expect(getCoverLetterLanguagePack('da-DK').requiresGrammaticalGender).toBe(false);
    expect(getCoverLetterLanguagePack('uk-UA').label).toBe('Ukrainian');
    expect(getCoverLetterLanguagePack('uk-UA').requiresGrammaticalGender).toBe(true);
  });

  it('provides greeting and closing templates for all letter locale packs', () => {
    const enPack = getCoverLetterLanguagePack('en');
    const daPack = getCoverLetterLanguagePack('da-DK');
    const ukPack = getCoverLetterLanguagePack('uk-UA');

    expect(enPack.prompt.letter.greetings.length).toBeGreaterThan(0);
    expect(enPack.prompt.letter.closings.length).toBeGreaterThan(0);
    expect(daPack.prompt.letter.greetings.length).toBeGreaterThan(0);
    expect(daPack.prompt.letter.closings.length).toBeGreaterThan(0);
    expect(ukPack.prompt.letter.greetings.length).toBeGreaterThan(0);
    expect(ukPack.prompt.letter.closings.length).toBeGreaterThan(0);
  });

  it('keeps ukrainian prompt artifact available for future activation', () => {
    const ukPack = getCoverLetterLanguagePackByLocale('uk-UA');
    expect(ukPack.label).toBe('Ukrainian');
    expect(ukPack.prompt.naturalnessRules.length).toBeGreaterThan(0);
    expect(ukPack.validation.rules.length).toBeGreaterThan(0);
  });
});
