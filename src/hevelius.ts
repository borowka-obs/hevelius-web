import { Injectable } from '@angular/core';
import packageJson from '../package.json';

@Injectable({
  providedIn: 'root'
})
export class Hevelius {
    static title = 'Hevelius';
    static version: string = packageJson.version;

    // Make sure there is no trailing slash
    static apiUrl = 'http://localhost:5000/api';
}
