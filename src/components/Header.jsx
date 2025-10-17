"use client";

import { useState } from "react";
import { Dialog, DialogPanel } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { getUser } from "../utils/getUser";
import { ADMIN_ENUMS } from "../utils/enums";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const authUser = getUser();
  const navigate = useNavigate();

  if (!authUser) navigate("/login");

  const nav = [
    { name: "Dashboard", href: `/dashboard${authUser?.route || "/wadata"}` },
    {
      name: "Department summary",
      href: `/summary${authUser?.route || "/wadata"}`,
    },
    { name: "Attendance", href: `/attendance${authUser?.route || "/wadata"}` },
  ];

  const adminNavigation = [
    { name: "Dashboard", href: "/attendance/dashboard" },
    {
      name: "Department summary",
      href: "/attendance/summary",
    },
  ];

  const navigation =
    authUser?.department?.toLowerCase() === ADMIN_ENUMS.ADMIN_DEPARTMENT.toLowerCase()
      ? adminNavigation
      : nav;

  return (
    <header className="bg-white">
      <nav
        aria-label="Global"
        className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8"
      >
        <a href="/dashboard" className="-m-1.5 p-1.5 flex">
          <span className="sr-only">Dashboard</span>
          <span>HICC - Gbagada</span>
          <img alt="" src="/logo.jpg" className="h-8 w-auto" />
        </a>
        <div className="flex lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
          >
            <span className="sr-only">Open main menu</span>
            <Bars3Icon aria-hidden="true" className="size-6" />
          </button>
        </div>
        <div className="hidden lg:flex lg:gap-x-12">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="text-sm/6 font-semibold text-gray-900 cursor-pointer"
            >
              {item.name}
            </a>
          ))}
          {!authUser ? (
            <a
              href="/login"
              className="text-sm/6 font-semibold text-gray-900 cursor-pointer"
            >
              Log in <span aria-hidden="true">&rarr;</span>
            </a>
          ) : (
            <div
              className="text-sm/6 font-semibold text-gray-900 cursor-pointer"
              onClick={() => {
                sessionStorage.removeItem("authUser");
                sessionStorage.removeItem("accessToken");
                navigate("/login");
              }}
            >
              Logout
            </div>
          )}
        </div>
      </nav>
      <Dialog
        open={mobileMenuOpen}
        onClose={setMobileMenuOpen}
        className="lg:hidden"
      >
        <div className="fixed inset-0 z-10" />
        <DialogPanel className="fixed inset-y-0 right-0 z-10 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
          <div className="flex items-center justify-between">
            <a href="/dashboard" className="-m-1.5 p-1.5">
              <span className="sr-only">Dashboard</span>
              <span>HICC - Gbagada</span>
              <img alt="" src="/logo.jpg" className="h-8 w-auto" />
            </a>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="-m-2.5 rounded-md p-2.5 text-gray-700"
            >
              <span className="sr-only">Close menu</span>
              <XMarkIcon aria-hidden="true" className="size-6" />
            </button>
          </div>
          <div className="mt-6 flow-root">
            <div className="-my-6 divide-y divide-gray-500/10">
              <div className="space-y-2 py-6">
                {navigation.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-900 hover:bg-gray-50"
                  >
                    {item.name}
                  </a>
                ))}
              </div>
              <div className="py-6">
                {!authUser ? (
                  <a
                    href="/login"
                    className="text-sm/6 font-semibold text-gray-900 cursor-pointer"
                  >
                    Log in <span aria-hidden="true">&rarr;</span>
                  </a>
                ) : (
                  <div
                    className="text-sm/6 font-semibold text-gray-900 cursor-pointer"
                    onClick={() => {
                      sessionStorage.removeItem("authUser");
                      navigate("/login");
                    }}
                  >
                    Logout
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogPanel>
      </Dialog>
    </header>
  );
}
