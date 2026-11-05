import { Component, Input } from '@angular/core';
import { LoaderService } from '../services/loader.service';
@Component({
  selector: 'app-loader',
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.css']
})
export class LoaderComponent {
  /** When true (default), loader covers the entire viewport.
   *  When false, it covers only the area below the fixed navbar. */
  @Input() isFullPage: boolean = true;
  constructor(public loaderService: LoaderService) {}
}
