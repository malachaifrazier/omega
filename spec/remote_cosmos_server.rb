#!/usr/bin/ruby
# remote server implementation, test program for externat entity management
#
# Copyright (C) 2012 Mohammed Morsi <mo@morsi.org>
# Licensed under the AGPLv3+ http://www.gnu.org/licenses/agpl.txt

$:<< "lib"

require 'rubygems'
require 'motel'
require 'users'
require 'cosmos'
require 'omega/roles'
require 'rjr/amqp_node'

require 'spec/spec_helper'

#RJR::Logger.log_level = ::Logger::INFO

Users::RJRAdapter.init
Motel::RJRAdapter.init
Cosmos::RJRAdapter.init

rcm  = Omega::Roles.create_user('rcm', 'mcr')
Omega::Roles.create_user_role(rcm, :remote_cosmos_manager)

amqp_node  = RJR::AMQPNode.new   :node_id => 'remote_server', :broker => 'localhost'

amqp_node.listen

sleep 3

local_node = RJR::LocalNode.new  :node_id => 'remote_server'
session = local_node.invoke_request('users::login', rcm)
local_node.message_headers['session_id'] = session.id

gal2 = Cosmos::Galaxy.new(:name => 'gal2', :location => Motel::Location.new(:id => 'g2'))
sys1 = Cosmos::SolarSystem.new :name => 'sys1', :location => Motel::Location.new(:id => 's1')
sys2 = Cosmos::SolarSystem.new :name => 'sys2', :remote_queue => 'cosmos-rrjr-test-queue', :location => Motel::Location.new(:id => 's2')

local_node.invoke_request('cosmos::create_entity', gal2, :universe)
local_node.invoke_request('cosmos::create_entity', sys1, 'gal1')
local_node.invoke_request('cosmos::create_entity', sys2, 'gal1')

amqp_node.join
