import { Component, OnInit } from '@angular/core';
import { ServiceService } from 'src/app/services/service.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-admin-clients',
  templateUrl: './admin-clients.component.html',
  styleUrls: ['./admin-clients.component.css']
})
export class AdminClientsComponent implements OnInit {
  constructor(private service: ServiceService, private location: Location) { }

  client: any[] = []; // Full data from backend
  cli: any[] = [];    // Filtered data for display
  searchText: string = '';

  ngOnInit(): void {
    this.loadDetails();
  }

  goBack() {
    this.location.back();
  }

  loadDetails() {
    this.service.get("/admin/clients").subscribe((d: any[]) => {
      this.client = d.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      this.cli = [...this.client]; // Make a copy for filtering
    });
  }

  onSearch() {
    const query = this.searchText.trim();

    if (!query) {
      this.cli = [...this.client]; // reset list
      return;
    }

    const q = query.toLowerCase();

    this.cli = this.client.filter(c => {
      return (
        c.c_id?.toString().toLowerCase().includes(q) ||
        c.fullname?.toLowerCase().includes(q) ||
        c.companyname?.toLowerCase().includes(q) ||
        c.contact?.toString().toLowerCase().includes(q)
      );
    });
  }

  selectedClient: any = null;

  openModal(clientInfo: any) {
    this.selectedClient = clientInfo;
  }

  closeModal() {
    this.selectedClient = null;
  }

}
