const fs = require('fs');
let html = fs.readFileSync('src/app/dashboard/admin-dashboard/admin-dashboard.component.html', 'utf8');

// The file currently has no filters for Course, Resource, Telemetry, Global.
// I will just replace the headers.

html = html.replace(
    '<div class="col-12 mb-2 d-flex justify-content-between align-items-center flex-wrap gap-2">\n            <h4 class="fw-extrabold text-indigo mb-0"><i class="bi bi-speedometer2 me-2"></i>Dashboard Overview</h4>',
    <div class="col-12 mb-2 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <h4 class="fw-extrabold text-indigo mb-0"><i class="bi bi-speedometer2 me-2"></i>Dashboard Overview</h4>
          <div class="d-flex align-items-center gap-2 bg-white px-3 py-2 rounded-pill shadow-sm border">
            <i class="bi bi-calendar3 text-primary"></i>
            <span class="fw-bold text-muted small text-nowrap">Global Filter:</span>
            <select class="form-select form-select-sm border-0 shadow-none fw-semibold text-dark bg-transparent py-0" style="width: auto; cursor: pointer;" [(ngModel)]="globalDateFilter" (change)="onGlobalDateFilterChange( + "$event" + )">
              <option *ngFor="let opt of filterOptions" [value]="opt.value">{{ opt.label }}</option>
            </select>
            <div *ngIf="globalDateFilter === -1" class="custom-date-container d-flex align-items-center mx-2">
              <input type="date" class="form-control form-control-sm custom-date-input" [(ngModel)]="globalStartDate" (change)="onCustomDateChange('global')">
              <span class="text-muted fw-bold small px-1"><i class="bi bi-arrow-right-short"></i></span>
              <input type="date" class="form-control form-control-sm custom-date-input" [(ngModel)]="globalEndDate" (change)="onCustomDateChange('global')">
            </div>
          </div>
);

html = html.replace(
    '<h5 class="fw-bold text-indigo mb-0"><i class="bi bi-bar-chart-fill me-2 text-primary"></i> Course Enrollment Analytics</h5>',
    <h5 class="fw-bold text-indigo mb-0"><i class="bi bi-bar-chart-fill me-2 text-primary"></i> Course Enrollment Analytics</h5>
                <div class="d-flex align-items-center gap-2">
                  <div *ngIf="courseDateFilter === -1" class="custom-date-container d-flex align-items-center mx-2">
                    <input type="date" class="form-control form-control-sm custom-date-input" [(ngModel)]="courseStartDate" (change)="onCustomDateChange('course')">
                    <span class="text-muted fw-bold small px-1"><i class="bi bi-arrow-right-short"></i></span>
                    <input type="date" class="form-control form-control-sm custom-date-input" [(ngModel)]="courseEndDate" (change)="onCustomDateChange('course')">
                  </div>
                  <select class="form-select form-select-sm rounded-pill shadow-none border bg-light text-muted fw-semibold" style="width: auto;" [(ngModel)]="courseDateFilter" (change)="onLocalDateFilterChange('course',  + "$event" + )">
                    <option *ngFor="let opt of filterOptions" [value]="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
);

html = html.replace(
    '<h5 class="fw-bold text-indigo mb-0"><i class="bi bi-file-earmark-bar-graph-fill me-2 text-success"></i> Resource Format Analytics</h5>',
    <h5 class="fw-bold text-indigo mb-0"><i class="bi bi-file-earmark-bar-graph-fill me-2 text-success"></i> Resource Format Analytics</h5>
                <div class="d-flex align-items-center gap-2">
                  <div *ngIf="resourceDateFilter === -1" class="custom-date-container d-flex align-items-center mx-2">
                    <input type="date" class="form-control form-control-sm custom-date-input" [(ngModel)]="resourceStartDate" (change)="onCustomDateChange('resource')">
                    <span class="text-muted fw-bold small px-1"><i class="bi bi-arrow-right-short"></i></span>
                    <input type="date" class="form-control form-control-sm custom-date-input" [(ngModel)]="resourceEndDate" (change)="onCustomDateChange('resource')">
                  </div>
                  <select class="form-select form-select-sm rounded-pill shadow-none border bg-light text-muted fw-semibold" style="width: auto;" [(ngModel)]="resourceDateFilter" (change)="onLocalDateFilterChange('resource',  + "$event" + )">
                    <option *ngFor="let opt of filterOptions" [value]="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
);

html = html.replace(
    '<h5 class="fw-bold text-indigo mb-0"><i class="bi bi-activity me-2 text-danger"></i> General System Telemetry</h5>',
    <h5 class="fw-bold text-indigo mb-0"><i class="bi bi-activity me-2 text-danger"></i> General System Telemetry</h5>
                <div class="d-flex align-items-center gap-2">
                  <div *ngIf="telemetryDateFilter === -1" class="custom-date-container d-flex align-items-center mx-2">
                    <input type="date" class="form-control form-control-sm custom-date-input" [(ngModel)]="telemetryStartDate" (change)="onCustomDateChange('telemetry')">
                    <span class="text-muted fw-bold small px-1"><i class="bi bi-arrow-right-short"></i></span>
                    <input type="date" class="form-control form-control-sm custom-date-input" [(ngModel)]="telemetryEndDate" (change)="onCustomDateChange('telemetry')">
                  </div>
                  <select class="form-select form-select-sm rounded-pill shadow-none border bg-light text-muted fw-semibold" style="width: auto;" [(ngModel)]="telemetryDateFilter" (change)="onLocalDateFilterChange('telemetry',  + "$event" + )">
                    <option *ngFor="let opt of filterOptions" [value]="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
);

// Summary was already updated by PowerShell, but let's make sure its classes are correct.
const summaryPattern = /<div class="card-header bg-transparent border-0 pt-4 pb-0 px-4 d-flex justify-content-between align-items-center">[\s\S]*?Accessibility Preferences<\/h5>[\s\S]*?<\/select>\s*<\/div>\s*<\/div>/g;

html = html.replace(summaryPattern, <div class="card-header bg-transparent border-0 pt-4 pb-0 px-4 d-flex justify-content-between align-items-center">
                <h5 class="fw-bold text-indigo mb-0"><i class="bi bi-pie-chart-fill me-2 text-pink"></i> Accessibility Preferences</h5>
                <div class="d-flex align-items-center gap-2">
                  <div *ngIf="summaryDateFilter === -1" class="custom-date-container d-flex align-items-center mx-2">
                    <input type="date" class="form-control form-control-sm custom-date-input" [(ngModel)]="summaryStartDate" (change)="onCustomDateChange('summary')">
                    <span class="text-muted fw-bold small px-1"><i class="bi bi-arrow-right-short"></i></span>
                    <input type="date" class="form-control form-control-sm custom-date-input" [(ngModel)]="summaryEndDate" (change)="onCustomDateChange('summary')">
                  </div>
                  <select class="form-select form-select-sm rounded-pill shadow-none border bg-light text-muted fw-semibold" style="width: auto;" [(ngModel)]="summaryDateFilter" (change)="onLocalDateFilterChange('summary',  + "$event" + )">
                    <option *ngFor="let opt of filterOptions" [value]="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
              </div>);

fs.writeFileSync('src/app/dashboard/admin-dashboard/admin-dashboard.component.html', html);
