import {it,expect} from 'vitest';
import {csvCell} from '@/lib/utils';
it('exports user data as text without executable spreadsheet formulas',()=>{
 for(const input of ['=HYPERLINK("https://evil.test")','+SUM(A1)','-1+1','@SUM(A1)','\t=CMD()','\r\n=CMD()'])expect(csvCell(input).startsWith('"\'')).toBe(true);
 expect(csvCell('Guest "One"')).toBe('"Guest ""One"""');
 expect(csvCell(1000)).toBe('"1000"');
});
