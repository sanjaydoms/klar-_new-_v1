import React from 'react'
import CruiseBookings from './CruiseBookings'
import { TopDestinations } from './TopDestinations'
import FeaturedCruises from './FeaturedCruises'
import NeedHelperBanner from './NeedHelperBanner'
import Footer2 from '@/components/Footer/Footer2'

export const CruiseContent = () => {
  return (
    <>
    <CruiseBookings/>
    <TopDestinations/>
    <FeaturedCruises/>
    <NeedHelperBanner/>
    <Footer2/>
</>
  )
}
