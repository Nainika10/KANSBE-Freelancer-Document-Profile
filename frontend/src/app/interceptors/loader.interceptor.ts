import { Injectable } from '@angular/core';
import {
    HttpEvent,
    HttpHandler,
    HttpInterceptor,
    HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoaderService } from '../services/loader.service';

@Injectable()
export class LoaderInterceptor implements HttpInterceptor {

    constructor(private loaderService: LoaderService) { }

    intercept(req: HttpRequest<any>, next: HttpHandler) {

        // Skip loader for specific APIs
        if (req.headers.has('skip-loader') || req.url.includes('/freelancer-duration/ping') || req.url.includes('/freelancer-duration/logout')) {
            return next.handle(req);
        }

        this.loaderService.show();

        return next.handle(req).pipe(
            finalize(() => this.loaderService.hide())
        );
    }
}