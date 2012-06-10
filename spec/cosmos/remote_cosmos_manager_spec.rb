# remote cosmos manager tests
#
# Copyright (C) 2012 Mohammed Morsi <mo@morsi.org>
# Licensed under the AGPLv3+ http://www.gnu.org/licenses/agpl.txt

require File.dirname(__FILE__) + '/../spec_helper'
require 'rjr/local_node'
require 'rjr/amqp_node'

describe Cosmos::RemoteCosmosManager do

  before(:all) do
    Motel::RJRAdapter.init
    Users::RJRAdapter.init
    Cosmos::RJRAdapter.init

    user = Users::User.new :id => 'rcm', :password => 'mcr'
    @local_node = RJR::LocalNode.new :node_id => 'motel-rcm-test'
    @local_node.invoke_request('users::create_entity', user)
    @local_node.invoke_request('users::add_privilege', user.id, 'create',   'cosmos_entities')
    @local_node.invoke_request('users::add_privilege', user.id, 'modify',   'cosmos_entities')
    @local_node.invoke_request('users::add_privilege', user.id, 'view',     'cosmos_entities')

    @amqp_node = RJR::AMQPNode.new :broker => 'localhost', :node_id => 'motel-rcm-test'
    @server_thread = Thread.new {
      @amqp_node.listen
    }
  end

  after(:all) do
    Motel::Runner.instance.stop
    @amqp_node.stop
    @amqp_node.join
    @server_thread.join
  end

  before(:each) do
    Motel::Runner.instance.clear
    Cosmos::Registry.instance.init
  end

  it "should encapsulate one amqp node per remote queue" do
    rcm = Cosmos::RemoteCosmosManager.new
    q1 = rcm.remote_node_for 'motel-rcm-test-queue'
    q2 = rcm.remote_node_for 'motel-rcm-test-queue'
    #q3 = rcm.remote_node_for 'foobar'
    q1.should == q2
    #q1.should_not == q3
  end

  it "should provide access to get remote galaxies" do
    gal = Cosmos::Galaxy.new :name => 'rmg42'
    unv = Cosmos::Registry.instance.find_entity :type => :universe
    unv.add_child gal

    rcm = Cosmos::RemoteCosmosManager.new
    rgal = rcm.get_entity(Cosmos::Galaxy.new(:name => 'rmg42', :remote_queue => 'motel-rcm-test-queue'))
    rgal.name.should == gal.name
    rgal.to_s.should == gal.to_s
    rgal.should_not == gal
  end

  it "should provide access to get remote systems" do
    sys = Cosmos::SolarSystem.new :name => 'rms42'
    gal = Cosmos::Galaxy.new :name => 'gal42'
    unv = Cosmos::Registry.instance.find_entity :type => :universe
    gal.add_child sys
    unv.add_child gal

    rcm = Cosmos::RemoteCosmosManager.new
    rsys = rcm.get_entity(Cosmos::SolarSystem.new(:name => 'rms42', :remote_queue => 'motel-rcm-test-queue'))
    rsys.name.should == sys.name
    rsys.to_s.should == sys.to_s
    rsys.should_not == sys
  end

  it "should provide access to create remote galaxies" do
    gal = Cosmos::Galaxy.new :name => 'rmg42', :remote_queue => 'motel-rcm-test-queue'

    rcm = Cosmos::RemoteCosmosManager.new
    rcm.create_entity(gal, :universe)

    rgal = Cosmos::Registry.instance.find_entity :type => :galaxy, :name => gal.name
    rgal.should_not be_nil
    rgal.name.should == gal.name
  end

  it "should provide access to create remote systems" do
    sys = Cosmos::SolarSystem.new :name => 'rms42', :remote_queue => 'motel-rcm-test-queue'
    gal = Cosmos::Galaxy.new :name => 'gal42'
    unv = Cosmos::Registry.instance.find_entity :type => :universe
    unv.add_child gal

    rcm = Cosmos::RemoteCosmosManager.new
    rcm.create_entity(sys, gal.name)

    rsys = Cosmos::Registry.instance.find_entity :type => :solarsystem, :name => sys.name
    rsys.should_not be_nil
    rsys.id.should == sys.id
  end
end