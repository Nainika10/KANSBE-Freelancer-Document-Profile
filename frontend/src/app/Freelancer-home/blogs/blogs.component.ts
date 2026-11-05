import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NewsService } from '../../services/news.service';

@Component({
  selector: 'app-blogs',
  templateUrl: './blogs.component.html',
  styleUrls: ['./blogs.component.css']
})
export class BlogsComponent implements OnInit {

  blogId: string | null = null;
  blogData: any = null;
  isLoading = true;
  isLiveArticle = false;
  data = true;

  constructor(
    private route: ActivatedRoute,
    private newsService: NewsService
  ) {}

  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.route.paramMap.subscribe(params => {
      this.blogId = params.get('id');
      if (!this.blogId) {
        this.data = false;
        this.isLoading = false;
        return;
      }
      this.data = true; // reset if ID exists
      this.loadBlog();
    });
  }

  loadBlog() {
    const article = this.newsService.getArticleByIndex(this.blogId!);
    (window as any).appLogger?.info('Article found:', article);

    if (article) {
      this.isLiveArticle = true;
      this.blogData = article;
    } else {
      // Article not in cache — try fetching news first then find it
      this.newsService.getLatestNews().subscribe({
        next: (articles) => {
          const i = parseInt(this.blogId!);
          if (!isNaN(i) && articles[i]) {
            this.isLiveArticle = true;
            this.blogData = articles[i];
          } else {
            this.isLiveArticle = false;
            this.blogData = this.getFallback();
          }
          this.isLoading = false;
        },
        error: () => {
          this.isLiveArticle = false;
          this.blogData = this.getFallback();
          this.isLoading = false;
        }
      });
      return; // exit early, loading handled above
    }

    this.isLoading = false;
  }

  getFallback(): any {
    return {
      title: 'Article Not Available',
      category: ['Technology'],
      author: 'KANSBE News',
      published: '',
      image: 'assets/hero-bg.png',
      description: 'This article could not be loaded. Please go back and try again.',
      url: null
    };
  }
}