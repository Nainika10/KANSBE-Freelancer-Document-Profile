import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ServiceService } from './service.service';

@Injectable({ providedIn: 'root' })
export class NewsService {

  private STORAGE_KEY = 'kansbe_news_v2'; // v2 forces fresh storage
  cachedArticles: any[] = [];

  constructor(
    private http: HttpClient,
    private service: ServiceService
  ) {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        this.cachedArticles = JSON.parse(saved);
        (window as any).appLogger?.info('Restored from storage:', this.cachedArticles.length, 'articles');
      }
    } catch (e) {
      this.cachedArticles = [];
    }
  }

  private saveToStorage(articles: any[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(articles));
      (window as any).appLogger?.info('Saved to storage:', articles.length, 'articles');
    } catch (e) {
      (window as any).appLogger?.error('Storage save failed:', e);
    }
  }

  setArticles(articles: any[]): void {
    if (articles && articles.length > 0) {
      // Normalize data to ensure 'image' field exists
      this.cachedArticles = articles.map(a => this.normalizeArticle(a));
      this.saveToStorage(this.cachedArticles);
    }
  }

  private normalizeArticle(a: any): any {
    return {
      ...a,
      image: a.image || a.urlToImage || 'assets/hero-bg.png',
      author: a.author || a.source?.name || 'KANSBE News',
      published: a.published || a.publishedAt || '',
      category: a.category && a.category.length > 0 ? a.category : ['News']
    };
  }

  getLatestNews(): Observable<any[]> {
    const timestamp = new Date().getTime();
    // Using ServiceService ensures correct base URL and headers
    return this.service.get(`/news/latest?t=${timestamp}`).pipe(
      map(response => {
        if (response && response.news && response.news.length > 0) {
          return response.news.map((a: any) => this.normalizeArticle(a));
        }
        return [];
      }),
      tap(articles => {
        if (articles.length > 0) {
          this.cachedArticles = articles;
          this.saveToStorage(articles);
        }
      }),
      catchError((err) => {
        (window as any).appLogger?.error('News fetch failed:', err);
        // Fall back to whatever is in storage
        return of(this.cachedArticles.length > 0 ? this.cachedArticles : []);
      })
    );
  }

  getArticleByIndex(index: string): any {
    const i = parseInt(index);
    if (isNaN(i)) return null;

    // Try memory first
    if (this.cachedArticles.length > 0) {
      (window as any).appLogger?.info('Found in memory cache, index:', i);
      return this.cachedArticles[i] || null;
    }

    // Try localStorage
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const articles = JSON.parse(saved);
        (window as any).appLogger?.info('Found in localStorage, index:', i);
        return articles[i] || null;
      }
    } catch (e) {
      return null;
    }

    return null;
  }
}