import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { GuidedtourService } from 'src/app/services/guidedtour.service';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

export interface TourPosition {
  top: number;
  left: number;
  arrowDir: 'top' | 'bottom' | 'left' | 'right';
  arrowOffset: number;
  spotlight: { top: number; left: number; width: number; height: number };
}
@Component({
  selector: 'app-guidancetour',
  templateUrl: './guidancetour.component.html',
  styleUrls: ['./guidancetour.component.css']
})
export class GuidancetourComponent implements OnInit, OnDestroy {
  @ViewChildren('tooltipEl') tooltipEls!: QueryList<ElementRef>;

  position: TourPosition | null = null;
  isVisible = false;

  private resizeSub: any;
  private routeSub: Subscription | undefined;

  constructor(
    public tourService: GuidedtourService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    window.addEventListener('resize', this.onResize.bind(this));

    this.resizeSub = setInterval(() => {
      if (this.tourService.isActive) {
        this.calculatePosition();
      }
    }, 16); // High frequency (60fps) for ultra-smooth tracking

    this.routeSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.tourService.isActive) {
        this.isVisible = false;
        setTimeout(() => this.calculatePosition(), 400);
      }
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    if (this.resizeSub) clearInterval(this.resizeSub);
    if (this.routeSub) this.routeSub.unsubscribe();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.tourService.isActive) {
      this.calculatePosition();
    }
  }

  calculatePosition(): void {
    const step = this.tourService.currentStep;
    if (!step) {
      this.position = null;
      this.isVisible = false;
      return;
    }

    const targetEl = this.tourService.findVisibleElement(step.elementSelector);
    if (!targetEl) {
      // Element not found yet, hide tooltip temporarily
      this.isVisible = false;
      return;
    }

    const targetRect = targetEl.getBoundingClientRect();

    // Exact dimensions of the tooltip
    const tooltipNative = this.tooltipEls?.first?.nativeElement;
    const tWidth = tooltipNative ? tooltipNative.offsetWidth : 320;
    const tHeight = tooltipNative ? tooltipNative.offsetHeight : 150;

    const padding = 6; // Tight, professional padding around element
    const spotlight = {
      top: targetRect.top - padding,
      left: targetRect.left - padding,
      width: targetRect.width + padding * 2,
      height: targetRect.height + padding * 2
    };

    const arrowGap = 16; // Space for arrow
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;
    let arrowDir: 'top' | 'bottom' | 'left' | 'right' = step.position;

    // Smart positioning logic based on exact tooltip height
    switch (step.position) {
      case 'bottom':
        top = targetRect.bottom + arrowGap;
        left = targetRect.left + (targetRect.width / 2) - (tWidth / 2);
        arrowDir = 'top';
        if (top + tHeight > viewportHeight - 10) { // Flip if no space below
          top = targetRect.top - tHeight - arrowGap;
          arrowDir = 'bottom';
        }
        break;
      case 'top':
        top = targetRect.top - tHeight - arrowGap;
        left = targetRect.left + (targetRect.width / 2) - (tWidth / 2);
        arrowDir = 'bottom';
        if (top < 10) { // Flip if no space above
          top = targetRect.bottom + arrowGap;
          arrowDir = 'top';
        }
        break;
      case 'left':
        top = targetRect.top + (targetRect.height / 2) - (tHeight / 2);
        left = targetRect.left - tWidth - arrowGap;
        arrowDir = 'right';
        break;
      case 'right':
        top = targetRect.top + (targetRect.height / 2) - (tHeight / 2);
        left = targetRect.right + arrowGap;
        arrowDir = 'left';
        break;
    }

    // Viewport clamping for tooltip
    left = Math.max(10, Math.min(left, viewportWidth - tWidth - 10));
    top = Math.max(10, Math.min(top, viewportHeight - tHeight - 10));

    // Precise Arrow offset (relative to tooltip)
    // The arrow is positioned absolutely inside the tooltip.
    let arrowOffset = 0;
    const arrowSize = 16; // 8px border * 2

    if (arrowDir === 'top' || arrowDir === 'bottom') {
      // We want the center of the arrow to point at the center of the target.
      const targetCenter = targetRect.left + targetRect.width / 2;
      arrowOffset = targetCenter - left - (arrowSize / 2);
      // Clamp arrow to stay within tooltip border radius bounds (e.g. 20px)
      arrowOffset = Math.max(20, Math.min(arrowOffset, tWidth - arrowSize - 20));
    } else {
      const targetCenter = targetRect.top + targetRect.height / 2;
      arrowOffset = targetCenter - top - (arrowSize / 2);
      arrowOffset = Math.max(20, Math.min(arrowOffset, tHeight - arrowSize - 20));
    }

    this.position = { top, left, arrowDir, arrowOffset, spotlight };
    this.isVisible = true;
    this.cdr.detectChanges();
  }

  onNext(): void {
    this.tourService.nextStep();
    // Immediate update after step change
    setTimeout(() => this.calculatePosition(), 0);
  }

  onPrev(): void {
    this.tourService.prevStep();
    setTimeout(() => this.calculatePosition(), 0);
  }

  onComplete(): void {
    const id = sessionStorage.getItem('fl_id') || sessionStorage.getItem('c_id') || '';
    this.tourService.completeTour(id);
  }
}

