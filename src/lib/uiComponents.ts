export interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  url: string;
  priority: number;
  section?: string;
  permissions?: string[];
  isAdminItem?: boolean;
}

export interface ServerMenuItem {
  id: string;
  label: string;
  icon: string;
  url: string;
  priority: number;
  feature?: string;
  permissions?: string[];
  isAdminItem?: boolean;
  isDefault?: boolean;
}

export interface ServerSection {
  id: string;
  title: string;
  priority: number;
  items: ServerSectionItem[];
}

export interface ServerSectionItem {
  id: string;
  label: string;
  value: string;
  icon?: string;
  priority: number;
  type?: 'text' | 'link' | 'button' | 'custom';
  onClick?: string;
  url?: string;
}

class UIComponentStore {
  private sidebarItems: SidebarItem[] = [];
  private serverMenuItems: ServerMenuItem[] = [];
  private serverSections: ServerSection[] = [];
  private addonRegistry = new Map<string, { sidebarIds: string[]; menuIds: string[]; sectionIds: string[] }>();

  private getAddonReg(slug: string) {
    if (!this.addonRegistry.has(slug)) {
      this.addonRegistry.set(slug, { sidebarIds: [], menuIds: [], sectionIds: [] });
    }
    return this.addonRegistry.get(slug)!;
  }

  addSidebarItem(item: SidebarItem, addonSlug?: string) {
    const idx = this.sidebarItems.findIndex((i) => i.id === item.id);
    if (idx !== -1) this.sidebarItems[idx] = item;
    else this.sidebarItems.push(item);
    if (addonSlug) {
      const reg = this.getAddonReg(addonSlug);
      if (!reg.sidebarIds.includes(item.id)) reg.sidebarIds.push(item.id);
    }
  }

  removeSidebarItem(id: string) {
    this.sidebarItems = this.sidebarItems.filter((i) => i.id !== id);
  }

  getSidebarItems(section?: string, isAdmin?: boolean): SidebarItem[] {
    let items = this.sidebarItems;
    if (section !== undefined) items = items.filter((i) => i.section === section);
    if (isAdmin === false) items = items.filter((i) => !i.isAdminItem);
    if (isAdmin === true) items = items.filter((i) => i.isAdminItem);
    return [...items].sort((a, b) => a.priority - b.priority);
  }

  addServerMenuItem(item: ServerMenuItem, addonSlug?: string) {
    const idx = this.serverMenuItems.findIndex((i) => i.id === item.id);
    if (idx !== -1) this.serverMenuItems[idx] = item;
    else this.serverMenuItems.push(item);
    if (addonSlug) {
      const reg = this.getAddonReg(addonSlug);
      if (!reg.menuIds.includes(item.id)) reg.menuIds.push(item.id);
    }
  }

  removeServerMenuItem(id: string) {
    this.serverMenuItems = this.serverMenuItems.filter((i) => i.id !== id);
  }

  getServerMenuItems(feature?: string): ServerMenuItem[] {
    let items = this.serverMenuItems;
    if (feature) items = items.filter((i) => !i.feature || i.feature === feature);
    return [...items].sort((a, b) => a.priority - b.priority);
  }

  addServerSection(section: ServerSection, addonSlug?: string) {
    const idx = this.serverSections.findIndex((s) => s.id === section.id);
    if (idx !== -1) this.serverSections[idx] = section;
    else this.serverSections.push(section);
    if (addonSlug) {
      const reg = this.getAddonReg(addonSlug);
      if (!reg.sectionIds.includes(section.id)) reg.sectionIds.push(section.id);
    }
  }

  removeServerSection(id: string) {
    this.serverSections = this.serverSections.filter((s) => s.id !== id);
  }

  getServerSections(): ServerSection[] {
    return [...this.serverSections].sort((a, b) => a.priority - b.priority);
  }

  addServerSectionItem(sectionId: string, item: ServerSectionItem) {
    const section = this.serverSections.find((s) => s.id === sectionId);
    if (!section) return;
    const idx = section.items.findIndex((i) => i.id === item.id);
    if (idx !== -1) section.items[idx] = item;
    else section.items.push(item);
  }

  removeServerSectionItem(sectionId: string, itemId: string) {
    const section = this.serverSections.find((s) => s.id === sectionId);
    if (!section) return;
    section.items = section.items.filter((i) => i.id !== itemId);
  }

  getServerSectionItems(sectionId: string): ServerSectionItem[] {
    const section = this.serverSections.find((s) => s.id === sectionId);
    return section ? [...section.items].sort((a, b) => a.priority - b.priority) : [];
  }

  clearAddonItems(slug: string) {
    const reg = this.addonRegistry.get(slug);
    if (!reg) return;
    reg.sidebarIds.forEach((id) => this.removeSidebarItem(id));
    reg.menuIds.forEach((id) => this.removeServerMenuItem(id));
    reg.sectionIds.forEach((id) => this.removeServerSection(id));
    this.addonRegistry.delete(slug);
  }
}

const globalStore = globalThis as unknown as { uiComponentStore?: UIComponentStore };
if (!globalStore.uiComponentStore) globalStore.uiComponentStore = new UIComponentStore();

export const uiComponentStore = globalStore.uiComponentStore;

export function initializeDefaultUIComponents() {
  uiComponentStore.addSidebarItem({
    id: 'servers',
    label: 'Servers',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 mt-0.5"><path d="M12.378 1.602a.75.75 0 0 0-.756 0L3 6.632l9 5.25 9-5.25-8.622-5.03ZM21.75 7.93l-9 5.25v9l8.628-5.032a.75.75 0 0 0 .372-.648V7.93ZM11.25 22.18v-9l-9-5.25v8.57a.75.75 0 0 0 .372.648l8.628 5.033Z" /></svg>',
    url: '/',
    priority: 10,
    isAdminItem: false,
  });
}
