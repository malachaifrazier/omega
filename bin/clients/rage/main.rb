#!/usr/bin/ruby
# A motel client using the Ruby Advanced Gaming Engine library to display location
#
# Flags: (see below)
#
# Copyright (C) 2010 Mohammed Morsi <movitto@yahoo.com>
# Licensed under the AGPLv3+ http://www.gnu.org/licenses/agpl.txt

CURRENT_DIR=File.dirname(__FILE__)
$: << File.expand_path(CURRENT_DIR + "/../../../lib")

require 'rubygems'
require 'optparse'
require 'rage'
require 'motel'

include Motel
include Motel::MovementStrategies


######################

def main()
    # command line parameters
    schema_file = nil
    mesh_file   = nil
    location_id = nil

    # setup cmd line options
    opts = OptionParser.new do |opts|
      opts.banner = "Usage: main.rb [command] [options]"

      opts.on("-h", "--help", "Print this help message") do
         puts opts
         exit
      end

      opts.on("-s", "--schema [path]", "Motel Schema File") do |path|
         schema_file = path
      end

      opts.on("-i", "--id [id]", "ID of location to display") do |id|
         location_id = id
      end

      opts.on("-m", "--mesh [uri]", "Mesh to display at location") do |uri|
         mesh_file = uri
      end
    end

    # parse cmd line
    begin
      opts.parse!(ARGV)
    rescue OptionParser::InvalidOption => e
      puts opts
      puts e.to_s
      exit
    end

    if schema_file.nil? || mesh_file.nil? || location_id.nil?
      puts "must specify motel schema, location id, and mesh to display"
      puts opts
      exit
    end

    mesh = resource :type => :mesh, :uri => mesh_file

    client = Motel::Client.new :schema_file => schema_file
    result = client.request :subscribe_to_location_movement, location_id
    client.on_location_moved = lambda { |loc, d, dx, dy, dz|
      mesh.show_at :x => loc.x, :y => loc.y, :z => loc.z
    }

    window(:width => 512, :height => 512) { |win|
       win.create_viewport
    }.show

    game.run

    #client.join
end

main()
